import { Injectable } from '@nestjs/common'
import { statfs } from 'fs/promises'
import { cpus, loadavg, totalmem } from 'os'
import { DiskHealthIndicator, HealthCheckError, HealthCheckResult, HealthCheckService, HealthIndicatorResult, HttpHealthIndicator, MongooseHealthIndicator } from '@nestjs/terminus'

const MEMORY_MULTIPLIER = 1024 * 1024
const GIGABYTE_MULTIPLIER = 1024 * 1024 * 1024
const CPU_LOAD_THRESHOLD = 0.85
const DISK_THRESHOLD_PERCENT = 0.95
const IS_DEV = process.env.NODE_ENV !== 'production'

const readPositiveIntegerEnv = (key: string): number | null => {
  const rawValue = process.env[key]
  if (!rawValue) {
    return null
  }

  const parsedValue = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null
  }

  return parsedValue
}

const resolveThresholdMb = (baseKey: string, defaults: { dev: number; prod: number }): number => {
  const envSuffix = IS_DEV ? 'DEV' : 'PROD'
  return (
    readPositiveIntegerEnv(baseKey) ||
    readPositiveIntegerEnv(`${baseKey}_${envSuffix}`) ||
    (IS_DEV ? defaults.dev : defaults.prod)
  )
}

const HEAP_MEMORY_THRESHOLD_MB = resolveThresholdMb('SESAME_HEALTH_HEAP_THRESHOLD_MB', { dev: 1024, prod: 512 })
const RSS_MEMORY_THRESHOLD_MB = resolveThresholdMb('SESAME_HEALTH_RSS_THRESHOLD_MB', { dev: 3072, prod: 1024 })
const NATIVE_MEMORY_DERIVE_MIN_SAMPLES = 6
const NATIVE_MEMORY_DERIVE_MIN_GROWTH_MB = resolveThresholdMb('SESAME_HEALTH_NATIVE_DERIVE_MIN_GROWTH_MB', { dev: 256, prod: 128 })
const ENABLE_HTTP_GITHUB_CHECK = !/^(false|0|off|no)$/i.test(`${process.env.SESAME_HEALTH_ENABLE_HTTP_CHECK || 'false'}`)
const HTTP_GITHUB_CHECK_INTERVAL_MS = readPositiveIntegerEnv('SESAME_HEALTH_HTTP_CHECK_INTERVAL_MS') || 5 * 60 * 1_000

export type HealthSnapshotPayload = HealthCheckResult & {
  system: {
    memory: {
      heapUsedMb: number
      heapTotalMb: number
      rssMb: number
      externalMb: number
      arrayBuffersMb: number
      nativeMb: number
      totalSystemMemoryMb: number
    }
    cpu: {
      load1mPerCore: number
      load5mPerCore: number
      load15mPerCore: number
      cores: number
      threshold: number
    }
  }
  futureChecks: {
    externalExposure: {
      enabled: boolean
      status: string
      note: string
    }
    leakedPasswords: {
      enabled: boolean
      status: string
      note: string
    }
  }
}

@Injectable()
export class HealthSnapshotService {
  private nativeMemoryHistory: number[] = []
  private lastHttpGithubIndicator: HealthIndicatorResult<'http-github'> | null = null
  private lastHttpGithubCheckedAt = 0

  public constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly http: HttpHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) { }

  public async collectSnapshot(): Promise<HealthSnapshotPayload> {
    const healthResult = await this.collectHealthResult()

    const memoryUsage = process.memoryUsage()
    const cpuCount = Math.max(cpus().length, 1)
    const [load1m, load5m, load15m] = loadavg()
    const cpuIndicator = this.checkCpu().cpu
    const heapIndicator = this.checkMemoryHeap().memory_heap
    const rssIndicator = this.checkMemoryRss().memory_rss
    const externalMb = Number((memoryUsage.external / MEMORY_MULTIPLIER).toFixed(2))
    const arrayBuffersMb = Number((memoryUsage.arrayBuffers / MEMORY_MULTIPLIER).toFixed(2))
    const nativeMb = Number((externalMb + arrayBuffersMb).toFixed(2))
    const memoryNativeIndicator = this.buildMemoryNativeIndicator(nativeMb, externalMb, arrayBuffersMb)

    const details = {
      ...((healthResult.details || {}) as HealthIndicatorResult),
      cpu: cpuIndicator,
      memory_heap: heapIndicator,
      memory_rss: rssIndicator,
      memory_native: memoryNativeIndicator,
    }
    const hasAnyDown = Object.values(details).some((indicator) => indicator?.status === 'down')

    return {
      ...healthResult,
      status: hasAnyDown ? 'error' : 'ok',
      details,
      system: {
        memory: {
          heapUsedMb: Number((memoryUsage.heapUsed / MEMORY_MULTIPLIER).toFixed(2)),
          heapTotalMb: Number((memoryUsage.heapTotal / MEMORY_MULTIPLIER).toFixed(2)),
          rssMb: Number((memoryUsage.rss / MEMORY_MULTIPLIER).toFixed(2)),
          externalMb,
          arrayBuffersMb,
          nativeMb,
          totalSystemMemoryMb: Number((totalmem() / MEMORY_MULTIPLIER).toFixed(2)),
        },
        cpu: {
          load1mPerCore: Number((load1m / cpuCount).toFixed(3)),
          load5mPerCore: Number((load5m / cpuCount).toFixed(3)),
          load15mPerCore: Number((load15m / cpuCount).toFixed(3)),
          cores: cpuCount,
          threshold: CPU_LOAD_THRESHOLD,
        },
      },
      futureChecks: {
        externalExposure: {
          enabled: false,
          status: 'not_configured',
          note: 'Reserved for a future check against a configured public URL (ex: APP_PUBLIC_URL).',
        },
        leakedPasswords: {
          enabled: false,
          status: 'not_implemented',
          note: 'Reserved for future leaked-password detection integration (k-anonymity/HIBP style).',
        },
      },
    }
  }

  private async collectHealthResult(): Promise<HealthCheckResult> {
    try {
      const checks: Array<() => Promise<HealthIndicatorResult>> = [
        () => this.checkMongoose(),
        () => this.checkStorage(),
      ]

      if (ENABLE_HTTP_GITHUB_CHECK) {
        checks.splice(1, 0, () => this.checkHttpGithubThrottled())
      }

      return await this.health.check(checks)
    } catch (error) {
      if (error instanceof HealthCheckError) {
        const details = this.extractHealthErrorDetails(error)
        return {
          status: 'error',
          info: {},
          error: details,
          details,
        }
      }

      throw error
    }
  }

  private async checkHttpGithubThrottled(): Promise<HealthIndicatorResult<'http-github'>> {
    const now = Date.now()
    const hasFreshValue = Boolean(
      this.lastHttpGithubIndicator &&
      now - this.lastHttpGithubCheckedAt < HTTP_GITHUB_CHECK_INTERVAL_MS,
    )

    if (hasFreshValue && this.lastHttpGithubIndicator) {
      return this.lastHttpGithubIndicator
    }

    try {
      const indicator = await this.http.pingCheck('http-github', 'https://github.com')
      this.lastHttpGithubIndicator = indicator
      this.lastHttpGithubCheckedAt = now
      return indicator
    } catch {
      const indicator: HealthIndicatorResult<'http-github'> = {
        'http-github': {
          status: 'down',
        },
      }
      this.lastHttpGithubIndicator = indicator
      this.lastHttpGithubCheckedAt = now
      return indicator
    }
  }

  private extractHealthErrorDetails(error: HealthCheckError): HealthIndicatorResult {
    const candidate = error.causes || {}
    if (typeof candidate === 'object' && candidate !== null && Object.keys(candidate).length > 0) {
      return candidate as HealthIndicatorResult
    }

    return {
      unknown: {
        status: 'down',
        message: error.message,
      },
    }
  }

  private buildMemoryNativeIndicator(nativeMb: number, externalMb: number, arrayBuffersMb: number): {
    status: 'up' | 'down'
    nativeMb: number
    externalMb: number
    arrayBuffersMb: number
    growthMb: number
    growthThresholdMb: number
    sampleCount: number
  } {
    this.nativeMemoryHistory.push(nativeMb)
    if (this.nativeMemoryHistory.length > NATIVE_MEMORY_DERIVE_MIN_SAMPLES) {
      this.nativeMemoryHistory.shift()
    }

    const sampleCount = this.nativeMemoryHistory.length
    const firstValue = this.nativeMemoryHistory[0] || nativeMb
    const growthMb = Number((nativeMb - firstValue).toFixed(2))
    const hasEnoughSamples = sampleCount >= NATIVE_MEMORY_DERIVE_MIN_SAMPLES
    const isStrictlyIncreasing =
      hasEnoughSamples &&
      this.nativeMemoryHistory.every((value, index, values) => index === 0 || value > values[index - 1])
    const isDrifting = isStrictlyIncreasing && growthMb >= NATIVE_MEMORY_DERIVE_MIN_GROWTH_MB

    return {
      status: isDrifting ? 'down' : 'up',
      nativeMb,
      externalMb,
      arrayBuffersMb,
      growthMb,
      growthThresholdMb: NATIVE_MEMORY_DERIVE_MIN_GROWTH_MB,
      sampleCount,
    }
  }

  private checkCpu(): Record<string, { status: 'up' | 'down'; load1mPerCore: number; threshold: number; cores: number }> {
    const cpuCount = Math.max(cpus().length, 1)
    const perCoreLoad = loadavg()[0] / cpuCount
    const indicator = {
      status: perCoreLoad <= CPU_LOAD_THRESHOLD ? 'up' : 'down',
      load1mPerCore: Number(perCoreLoad.toFixed(3)),
      threshold: CPU_LOAD_THRESHOLD,
      cores: cpuCount,
    } as const

    return { cpu: indicator }
  }

  private async checkMongoose(): Promise<Record<string, { status: 'up' | 'down'; pingMs: number }>> {
    const start = Date.now()

    try {
      await this.mongoose.pingCheck('mongoose')
      return {
        mongoose: {
          status: 'up',
          pingMs: Date.now() - start,
        },
      }
    } catch {
      throw new HealthCheckError('mongoose_check_failed', {
        mongoose: {
          status: 'down',
          pingMs: Date.now() - start,
        },
      })
    }
  }

  private async checkStorage(): Promise<Record<string, { status: 'up' | 'down'; usedPercent: number; thresholdPercent: number; totalGb: number; usedGb: number; freeGb: number }>> {
    await this.disk.checkStorage('storage', {
      path: '/',
      thresholdPercent: DISK_THRESHOLD_PERCENT,
    })

    const fsStats = await statfs('/')
    const totalBytes = fsStats.blocks * fsStats.bsize
    const freeBytes = fsStats.bavail * fsStats.bsize
    const usedBytes = Math.max(totalBytes - freeBytes, 0)
    const usedPercent = totalBytes > 0 ? usedBytes / totalBytes : 0

    const indicator = {
      status: usedPercent <= DISK_THRESHOLD_PERCENT ? 'up' : 'down',
      usedPercent: Number((usedPercent * 100).toFixed(2)),
      thresholdPercent: Number((DISK_THRESHOLD_PERCENT * 100).toFixed(2)),
      totalGb: Number((totalBytes / GIGABYTE_MULTIPLIER).toFixed(2)),
      usedGb: Number((usedBytes / GIGABYTE_MULTIPLIER).toFixed(2)),
      freeGb: Number((freeBytes / GIGABYTE_MULTIPLIER).toFixed(2)),
    } as const

    if (indicator.status === 'down') {
      throw new HealthCheckError('storage_check_failed', { storage: indicator })
    }

    return { storage: indicator }
  }

  private checkMemoryHeap(): Record<string, { status: 'up' | 'down'; usedMb: number; thresholdMb: number; usedPercent: number }> {
    const heapUsedMb = process.memoryUsage().heapUsed / MEMORY_MULTIPLIER
    const usedPercent = heapUsedMb / HEAP_MEMORY_THRESHOLD_MB

    const indicator = {
      status: heapUsedMb <= HEAP_MEMORY_THRESHOLD_MB ? 'up' : 'down',
      usedMb: Number(heapUsedMb.toFixed(2)),
      thresholdMb: HEAP_MEMORY_THRESHOLD_MB,
      usedPercent: Number((usedPercent * 100).toFixed(2)),
    } as const

    return { memory_heap: indicator }
  }

  private checkMemoryRss(): Record<string, { status: 'up' | 'down'; usedMb: number; thresholdMb: number; usedPercent: number }> {
    const rssMb = process.memoryUsage().rss / MEMORY_MULTIPLIER
    const usedPercent = rssMb / RSS_MEMORY_THRESHOLD_MB

    const indicator = {
      status: rssMb <= RSS_MEMORY_THRESHOLD_MB ? 'up' : 'down',
      usedMb: Number(rssMb.toFixed(2)),
      thresholdMb: RSS_MEMORY_THRESHOLD_MB,
      usedPercent: Number((usedPercent * 100).toFixed(2)),
    } as const

    return { memory_rss: indicator }
  }
}
