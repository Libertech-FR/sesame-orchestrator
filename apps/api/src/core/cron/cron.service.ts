
import { Injectable, Logger } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronHooksService } from './cron-hooks.service'
import { pick } from 'radash'
import { CronTaskDTO } from './_dto/config-task.dto'
import { CronJob } from 'cron'

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name)

  public constructor(private schedulerRegistry: SchedulerRegistry, private readonly cronHooksService: CronHooksService) {
    this.logger.log('CronService initialized')
  }

  public async search(): Promise<[CronTaskDTO[] & { _job: Partial<CronJob> }[], number]> {
    const tasks = this.cronHooksService.getCronTasks().map((task) => {
      let _job = undefined

      if (task.enabled) {
        try {
          const cronJob = this.schedulerRegistry.getCronJob(`cron-task-${task.name}`)
          _job = {
            lastExecution: cronJob.lastDate()?.toISOString() || null,
            nextExecution: cronJob.nextDate()?.toJSDate() || null,
            isActive: cronJob.isActive,
            isCallbackRunning: cronJob.isCallbackRunning,
            ...pick(cronJob, [
              'name',
              'threshold',
              'unrefTimeout',
              'runOnce',
              'waitForCompletion',
            ]),
          }
        } catch (error) {
          this.logger.warn(`No cron job found for task ${task.name}`)
        }
      }

      return {
        ...task,
        _job,
      }
    })
    const total = tasks.length

    return [tasks, total]
  }
}
