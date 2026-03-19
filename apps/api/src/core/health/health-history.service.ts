import { InjectRedis } from '@nestjs-modules/ioredis'
import { Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'

const HEALTH_HISTORY_RAW_KEY = 'core:health:history:raw'
const HEALTH_HISTORY_5M_INDEX_KEY = 'core:health:history:5m:index'
const HEALTH_HISTORY_5M_DATA_KEY = 'core:health:history:5m:data'
const HEALTH_HISTORY_1H_INDEX_KEY = 'core:health:history:1h:index'
const HEALTH_HISTORY_1H_DATA_KEY = 'core:health:history:1h:data'
const HEALTH_HISTORY_1D_INDEX_KEY = 'core:health:history:1d:index'
const HEALTH_HISTORY_1D_DATA_KEY = 'core:health:history:1d:data'

const FIVE_MINUTES_MS = 5 * 60 * 1_000
const ONE_HOUR_MS = 60 * 60 * 1_000
const ONE_DAY_MS = 24 * 60 * 60 * 1_000
const ONE_MONTH_MS = 30 * ONE_DAY_MS

const RAW_RETENTION_MS = ONE_HOUR_MS
const FIVE_MIN_RETENTION_MS = ONE_HOUR_MS
const HOURLY_RETENTION_MS = ONE_DAY_MS
const DAILY_RETENTION_MS = ONE_MONTH_MS

const RAW_TTL_SECONDS = Math.ceil(RAW_RETENTION_MS / 1_000) + 60
const FIVE_MIN_TTL_SECONDS = Math.ceil(FIVE_MIN_RETENTION_MS / 1_000) + 60
const HOURLY_TTL_SECONDS = Math.ceil(HOURLY_RETENTION_MS / 1_000) + 60
const DAILY_TTL_SECONDS = Math.ceil(DAILY_RETENTION_MS / 1_000) + 60

export type HealthHistorySnapshot = {
  timestamp: number
  status: string
  details: Record<string, unknown>
  system: Record<string, unknown>
  futureChecks?: Record<string, unknown>
}

@Injectable()
export class HealthHistoryService {
  private readonly logger = new Logger(HealthHistoryService.name)

  public constructor(
    @InjectRedis() private readonly redis: Redis,
  ) { }

  public async appendSnapshot(snapshot: Omit<HealthHistorySnapshot, 'timestamp'>): Promise<void> {
    const timestamp = Date.now()
    const payload: HealthHistorySnapshot = {
      ...snapshot,
      timestamp,
    }

    try {
      await this.redis
        .multi()
        .zadd(HEALTH_HISTORY_RAW_KEY, timestamp, JSON.stringify(payload))
        .zremrangebyscore(HEALTH_HISTORY_RAW_KEY, 0, timestamp - RAW_RETENTION_MS)
        .expire(HEALTH_HISTORY_RAW_KEY, RAW_TTL_SECONDS)
        .exec()

      await this.writeBucketSnapshot({
        indexKey: HEALTH_HISTORY_5M_INDEX_KEY,
        dataKey: HEALTH_HISTORY_5M_DATA_KEY,
        bucketSizeMs: FIVE_MINUTES_MS,
        retentionMs: FIVE_MIN_RETENTION_MS,
        ttlSeconds: FIVE_MIN_TTL_SECONDS,
        nowTimestamp: timestamp,
        payload,
      })
      await this.writeBucketSnapshot({
        indexKey: HEALTH_HISTORY_1H_INDEX_KEY,
        dataKey: HEALTH_HISTORY_1H_DATA_KEY,
        bucketSizeMs: ONE_HOUR_MS,
        retentionMs: HOURLY_RETENTION_MS,
        ttlSeconds: HOURLY_TTL_SECONDS,
        nowTimestamp: timestamp,
        payload,
      })
      await this.writeBucketSnapshot({
        indexKey: HEALTH_HISTORY_1D_INDEX_KEY,
        dataKey: HEALTH_HISTORY_1D_DATA_KEY,
        bucketSizeMs: ONE_DAY_MS,
        retentionMs: DAILY_RETENTION_MS,
        ttlSeconds: DAILY_TTL_SECONDS,
        nowTimestamp: timestamp,
        payload,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Cannot persist health history in Redis: ${message}`)
    }
  }

  public async appendAndGet(snapshot: Omit<HealthHistorySnapshot, 'timestamp'>): Promise<HealthHistorySnapshot[]> {
    await this.appendSnapshot(snapshot)
    return this.getAdaptiveHistory()
  }

  public async getLatestRawSnapshot(): Promise<HealthHistorySnapshot | null> {
    try {
      const item = await this.redis.zrevrange(HEALTH_HISTORY_RAW_KEY, 0, 0)
      if (!item[0]) {
        return null
      }
      return JSON.parse(item[0]) as HealthHistorySnapshot
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Cannot read latest raw health snapshot from Redis: ${message}`)
      return null
    }
  }

  public async getLiveHistory(): Promise<HealthHistorySnapshot[]> {
    const oldestAcceptedTimestamp = Date.now() - FIVE_MINUTES_MS
    try {
      const items = await this.redis.zrangebyscore(HEALTH_HISTORY_RAW_KEY, oldestAcceptedTimestamp, '+inf')
      return items
        .map((item) => {
          try {
            return JSON.parse(item) as HealthHistorySnapshot
          } catch {
            return null
          }
        })
        .filter((item): item is HealthHistorySnapshot => item !== null)
        .sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Cannot read live health history from Redis: ${message}`)
      return []
    }
  }

  public async getAdaptiveHistory(): Promise<HealthHistorySnapshot[]> {
    const nowTimestamp = Date.now()
    const fiveMinutesStart = nowTimestamp - ONE_HOUR_MS
    const oneHourStart = nowTimestamp - ONE_DAY_MS
    const oneDayStart = nowTimestamp - ONE_MONTH_MS

    try {
      const [fiveMinutesSnapshots, hourlySnapshots, dailySnapshots] = await Promise.all([
        this.readBucketSnapshots(HEALTH_HISTORY_5M_INDEX_KEY, HEALTH_HISTORY_5M_DATA_KEY, fiveMinutesStart, '+inf'),
        this.readBucketSnapshots(HEALTH_HISTORY_1H_INDEX_KEY, HEALTH_HISTORY_1H_DATA_KEY, oneHourStart, fiveMinutesStart - 1),
        this.readBucketSnapshots(HEALTH_HISTORY_1D_INDEX_KEY, HEALTH_HISTORY_1D_DATA_KEY, oneDayStart, oneHourStart - 1),
      ])

      return [...dailySnapshots, ...hourlySnapshots, ...fiveMinutesSnapshots].sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Cannot read health history from Redis: ${message}`)
      return []
    }
  }

  private async writeBucketSnapshot(params: {
    indexKey: string
    dataKey: string
    bucketSizeMs: number
    retentionMs: number
    ttlSeconds: number
    nowTimestamp: number
    payload: HealthHistorySnapshot
  }): Promise<void> {
    const {
      indexKey,
      dataKey,
      bucketSizeMs,
      retentionMs,
      ttlSeconds,
      nowTimestamp,
      payload,
    } = params

    const bucketTimestamp = Math.floor(nowTimestamp / bucketSizeMs) * bucketSizeMs
    const oldestAcceptedTimestamp = nowTimestamp - retentionMs
    const staleMembers = await this.redis.zrangebyscore(indexKey, 0, oldestAcceptedTimestamp)
    const bucketMember = `${bucketTimestamp}`
    const bucketPayload: HealthHistorySnapshot = {
      ...payload,
      timestamp: bucketTimestamp,
    }

    const pipeline = this.redis
      .multi()
      .hset(dataKey, bucketMember, JSON.stringify(bucketPayload))
      .zadd(indexKey, bucketTimestamp, bucketMember)
      .zremrangebyscore(indexKey, 0, oldestAcceptedTimestamp)
      .expire(indexKey, ttlSeconds)
      .expire(dataKey, ttlSeconds)

    if (staleMembers.length > 0) {
      pipeline.hdel(dataKey, ...staleMembers)
    }

    await pipeline.exec()
  }

  private async readBucketSnapshots(indexKey: string, dataKey: string, minScore: number, maxScore: number | '+inf'): Promise<HealthHistorySnapshot[]> {
    const memberIds = await this.redis.zrangebyscore(indexKey, minScore, maxScore)
    if (memberIds.length === 0) {
      return []
    }

    const serialized = await this.redis.hmget(dataKey, ...memberIds)
    return serialized
      .map((item) => {
        if (!item) {
          return null
        }
        try {
          return JSON.parse(item) as HealthHistorySnapshot
        } catch {
          return null
        }
      })
      .filter((item): item is HealthHistorySnapshot => item !== null)
  }
}
