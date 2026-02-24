
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

  /**
   * Recherche et liste les tâches cron configurées, avec support pour la recherche par nom ou description, et la pagination.
   *
   * @param search Recherche par nom ou description de la tâche cron
   * @param options Options de pagination (page, limit)
   * @returns Une liste paginée des tâches cron avec leurs détails d'exécution, et le nombre total de tâches correspondant à la recherche
   */
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

  /**
   * Lit les détails d'une tâche cron spécifique par son nom, incluant les informations d'exécution si la tâche est activée.
   *
   * @param name Nom de la tâche cron à lire
   * @returns Les détails de la tâche cron avec les informations d'exécution si elle est activée, ou null si la tâche n'existe pas
   */
  public async read(name: string): Promise<CronTaskDTO & { _job: Partial<CronJob> } | null> {
    const task = this.cronHooksService.getCronTasks().find((t) => t.name === name)
    if (!task) {
      return null
    }

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
  }
}
