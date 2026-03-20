import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { HealthHistoryService } from './health-history.service'
import { HealthSnapshotService } from './health-snapshot.service'

const DEFAULT_HEALTH_COLLECTION_INTERVAL_MS = 15_000
const parsedHealthCollectionIntervalMs = Number.parseInt(`${process.env.SESAME_HEALTH_COLLECTION_INTERVAL_MS || ''}`, 10)
const HEALTH_COLLECTION_INTERVAL_MS = Number.isFinite(parsedHealthCollectionIntervalMs) && parsedHealthCollectionIntervalMs > 0
  ? parsedHealthCollectionIntervalMs
  : DEFAULT_HEALTH_COLLECTION_INTERVAL_MS

@Injectable()
export class HealthCollectorService implements OnModuleInit {
  private readonly logger = new Logger(HealthCollectorService.name)

  public constructor(
    private readonly healthSnapshotService: HealthSnapshotService,
    private readonly healthHistoryService: HealthHistoryService,
  ) { }

  public async onModuleInit(): Promise<void> {
    await this.collectAndStoreSnapshot()
  }

  @Interval(HEALTH_COLLECTION_INTERVAL_MS)
  public async collectAndStoreSnapshot(): Promise<void> {
    try {
      const snapshot = await this.healthSnapshotService.collectSnapshot()
      await this.healthHistoryService.appendSnapshot({
        status: snapshot.status === 'error' ? 'down' : snapshot.status || 'unknown',
        details: snapshot.details || {},
        system: snapshot.system || {},
        futureChecks: snapshot.futureChecks || {},
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Health scheduled collection failed: ${message}`)
    }
  }
}
