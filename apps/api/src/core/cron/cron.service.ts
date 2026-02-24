
import { Injectable, Logger } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronHooksService } from './cron-hooks.service'
import { pick } from 'radash'
import { CronTaskDTO } from './_dto/config-task.dto'
import { CronJob } from 'cron'

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name)

  public constructor(
    private schedulerRegistry: SchedulerRegistry,
    private readonly cronHooksService: CronHooksService,
  ) {
  }

  public async search(
    search?: string,
    options?: { page?: number; limit?: number },
  ): Promise<[CronTaskDTO[] & { _job: Partial<CronJob> }[], number]> {
    options = {
      page: 1,
      limit: 10,
      ...options,
    }

    const tasks = this.cronHooksService.getCronTasks()
      .filter((task) => !search || task.name.includes(search) || task.description.includes(search))
    const total = tasks.length

    const result = tasks
      .slice((options.page - 1) * options.limit, options.page * options.limit)
      .map((task) => {
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

    return [result, total]
  }
}
