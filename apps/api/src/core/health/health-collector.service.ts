import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { HealthHistoryService } from './health-history.service'
import { HealthSnapshotService } from './health-snapshot.service'

const HEALTH_COLLECTION_INTERVAL_MS = 5_000

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
        status: snapshot.status || 'unknown',
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
