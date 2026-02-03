
import { Injectable, Logger } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name)

  public constructor(private schedulerRegistry: SchedulerRegistry) {
    this.logger.log('CronService initialized')
  }
}
