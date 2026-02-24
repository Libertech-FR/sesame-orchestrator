import { Injectable, Logger } from '@nestjs/common'
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { spawn } from 'child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { isConsoleEntrypoint } from '~/_common/functions/is-cli'
import { CronTaskDTO } from './_dto/config-task.dto'
import { loadcronTasks } from './_functions/load-cron-tasks.function'
import { ConfigService } from '@nestjs/config'
import { createHandlerLogger } from '~/_common/functions/handler-logger'

@Injectable()
export class CronHooksService {
  private readonly logger = new Logger(CronHooksService.name)

  private cronHandlerExpression = '0 * * * *' // Toutes les heures

  /**
   * Liste des tâches cron chargées depuis cron/*.yml
   * @protected
   * @type {CronTaskDTO[]}
   */
  protected cronTasks: CronTaskDTO[] = []

  /**
   * Timestamp de la dernière modification des fichiers cron/*.yml
   * @protected
   * @type {number}
   */
  protected _cronTaskFileAge = 0

  public getCronTasks(): CronTaskDTO[] {
    return this.cronTasks
  }

  public constructor(
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.logger.log('CronHooksService initialized')

    this.cronHandlerExpression = this.configService.get<string>('cron.handlerExpression', CronExpression.EVERY_HOUR)
  }

  public async onModuleInit(): Promise<void> {
    this.logger.log('CronHooksService module initialized')

    let files = []
    let defaultFiles = []
    const configDir = `${process.cwd()}/configs/cron`

    if (!existsSync(configDir)) {
      this.logger.warn(`Creating missing directory: ${configDir}`)
      mkdirSync(configDir, { recursive: true })
    }

    try {
      files = readdirSync(`${process.cwd()}/configs/cron`)
      defaultFiles = readdirSync(`${process.cwd()}/defaults/cron`)
    } catch (error) {
      this.logger.error('Error reading cron files', error.message, error.stack)
    }

    for (const file of defaultFiles) {
      if (!files.includes(file)) {
        try {
          const defaultFile = readFileSync(`${process.cwd()}/defaults/cron/${file}`, 'utf-8')
          writeFileSync(`${process.cwd()}/configs/cron/${file}`, defaultFile)
          this.logger.warn(`Copied default cron file: ${file}`)
        } catch (error) {
          this.logger.error(`Error copying default cron file: ${file}`, error.message, error.stack)
        }
      }
    }

    this.logger.log('CronHooksService (hooks) initialized')
  }

  public async onApplicationBootstrap(): Promise<void> {
    this.logger.verbose('Bootstrap CronHooksService application...')

    this.cronTasks = await this.refreshCronTasksFileCache()
    this._cronTaskFileAge = Date.now()

    this.logger.debug('Cron tasks:', JSON.stringify(this.cronTasks, null, 2))

    if (isConsoleEntrypoint()) {
      this.logger.debug('Skipping CronHooksService bootstrap in console mode.')
      return
    }

    const job = new CronJob(this.cronHandlerExpression, this.handleCron.bind(this))
    this.schedulerRegistry.addCronJob(`cron-trigger`, job)
    this.logger.warn(`Cron trigger cron job scheduled with expression: <${this.cronHandlerExpression}>`)
    job.start()
    await job.fireOnTick()

    this.logger.log('CronHooksService (bootstrap) initialized')
  }

  private async handleCron(): Promise<void> {
    this.logger.verbose('Syncing cron tasks jobs from configs/cron/*.yml')

    // Capture previous tasks to detect option changes
    const previousTasks = new Map<string, CronTaskDTO>()
    for (const t of this.cronTasks) {
      previousTasks.set(`cron-task-${t.name}`, t)
    }

    // Refresh cache to ensure we work with latest tasks
    try {
      await this.refreshCronTasksFileCache()
    } catch (err) {
      this.logger.error('Error refreshing cron tasks cache before sync', err?.message || err)
    }

    const desiredTasks = new Map<string, CronTaskDTO>()
    for (const task of this.cronTasks) {
      const jobName = `cron-task-${task.name}`
      desiredTasks.set(jobName, task)
    }

    // Inspecte les jobs existants dans le SchedulerRegistry
    let existingJobs: Map<string, CronJob> = new Map()
    try {
      // SchedulerRegistry exposes getCronJobs()
      // @ts-ignore - depending on Nest version typings
      existingJobs = this.schedulerRegistry.getCronJobs()
    } catch (err) {
      this.logger.error('Error while retrieving existing cron jobs from registry', err?.message || err)
    }

    // Supprimer les jobs qui ne sont plus dans les tâches désirées
    for (const [name, job] of existingJobs) {
      if (!name.startsWith('cron-task-')) continue

      const desired = desiredTasks.get(name)
      const previous = previousTasks.get(name)
      if (!desired) {
        try {
          job.stop()
        } catch (e) {
          this.logger.warn(`Failed to stop removed cron job <${name}>: ${e?.message || e}`)
        }
        try {
          this.schedulerRegistry.deleteCronJob(name)
          this.logger.log(`Removed cron job not present in configs: ${name}`)
        } catch (e) {
          this.logger.error(`Error deleting cron job <${name}> from registry:`, e?.message || e)
        }
        continue
      }

      // Si la tâche est désactivée, arrêter et supprimer le job
      if (!desired.enabled) {
        try {
          job.stop()
        } catch (e) {
          this.logger.warn(`Failed to stop disabled cron job <${name}>: ${e?.message || e}`)
        }
        try {
          this.schedulerRegistry.deleteCronJob(name)
          this.logger.log(`Disabled cron job removed from registry: ${name}`)
        } catch (e) {
          this.logger.error(`Error deleting disabled cron job <${name}>:`, e?.message || e)
        }
        continue
      }

      // Si les options ont changé, recréer le job pour prendre en compte les nouvelles options
      try {
        const prevOptions = previous ? previous.options : undefined
        const newOptions = desired.options
        const prevSerialized = prevOptions ? JSON.stringify(prevOptions) : ''
        const newSerialized = newOptions ? JSON.stringify(newOptions) : ''
        if (prevSerialized !== newSerialized) {
          try {
            job.stop()
          } catch (_) { }
          try {
            this.schedulerRegistry.deleteCronJob(name)
          } catch (_) { }
          this.logger.log(`Cron job <${name}> options changed, recreating with new options`)
          const recreated = this.buildCronJobForTask(desired)
          this.schedulerRegistry.addCronJob(name, recreated)
          recreated.start()
          continue
        }
      } catch (e) {
        this.logger.warn(`Error while comparing options for cron job <${name}>: ${e?.message || e}`)
      }

      // Si la tâche existe et est activée, vérifier le changement de planification
      try {
        const currentSchedule = job && job.cronTime && job.cronTime.source ? job.cronTime.source : (job && job.toString ? job.toString() : '')
        if (currentSchedule && desired.schedule && currentSchedule !== desired.schedule) {
          // restart with new schedule
          job.stop()
          this.schedulerRegistry.deleteCronJob(name)
          this.logger.log(`Cron job <${name}> schedule changed, recreating with <${desired.schedule}>`)
          const newJob = this.buildCronJobForTask(desired)
          this.schedulerRegistry.addCronJob(name, newJob)
          newJob.start()
        }
      } catch (e) {
        this.logger.warn(`Could not compare schedule for cron job <${name}>, recreating: ${e?.message || e}`)
        try {
          job.stop()
        } catch (_) { }
        try {
          this.schedulerRegistry.deleteCronJob(name)
        } catch (_) { }
        const newJob = this.buildCronJobForTask(desired)
        this.schedulerRegistry.addCronJob(name, newJob)
        newJob.start()
      }
    }

    // Create missing jobs for enabled tasks
    for (const [jobName, task] of desiredTasks) {
      if (!task.enabled) continue
      if (this.schedulerRegistry.doesExist && this.schedulerRegistry.doesExist('cron', jobName)) {
        // already handled schedule changes above
        continue
      }

      try {
        const job = this.buildCronJobForTask(task)
        this.schedulerRegistry.addCronJob(jobName, job)
        job.start()
        this.logger.log(`Scheduled cron task job: ${jobName} with schedule: ${task.schedule}`)
      } catch (e) {
        this.logger.error(`Failed to schedule cron job <${jobName}>:`, e?.message || e)
      }
    }
  }

  private buildCronJobForTask(task: CronTaskDTO): CronJob {
    const job = new CronJob(task.schedule, async (): Promise<void> => {
      this.logger.log(`Executing cron task: ${task.name} with handler: ${task.handler}`)
      try {
        const current = this.cronTasks.find((t) => t.name === task.name)
        const options = current?.options
        await this.executeHandlerCommand(task.name, task.handler, options)
      } catch (err) {
        this.logger.error(`Error executing cron task <${task.name}>:`, err?.message || err)
      }
    })
    return job
  }

  private async executeHandlerCommand(name: string, handler: string, options?: Record<string, any>): Promise<void> {
    const args: string[] = []

    if (options && typeof options === 'object') {
      for (const [k, v] of Object.entries(options)) {
        if (typeof v === 'boolean') {
          if (v) args.push(`--${k}`)
        } else if (v === null || v === undefined) {
          // skip
        } else if (typeof v === 'object') {
          args.push(`--${k}='${JSON.stringify(v)}'`)
        } else {
          args.push(`--${k}='${String(v)}'`)
        }
      }
    }

    const cmd = 'yarn'
    const cmdArgs = ['run', 'console', handler.split('-').join(' '), ...args]

    const handlerLogger = createHandlerLogger(this.configService, name)
    this.logger.log(`Spawning command: ${cmd} ${cmdArgs.join(' ')}`)

    await new Promise<void>((resolve, reject) => {
      const child = spawn(cmd, cmdArgs, { shell: true, cwd: process.cwd(), env: process.env })

      child.stdout?.on('data', (chunk) => handlerLogger.log(chunk.toString()))
      child.stderr?.on('data', (chunk) => handlerLogger.error(chunk.toString()))

      child.on('error', (err) => {
        handlerLogger.close()
        this.logger.error(`Failed to spawn handler command <${handler}>: ${err?.message || err}`)
        reject(err)
      })

      child.on('close', (code) => {
        handlerLogger.close()
        if (code === 0) {
          this.logger.log(`Handler command <${handler}> completed successfully`)
          resolve()
        } else {
          const err = new Error(`Handler command <${handler}> exited with code ${code}`)
          this.logger.error(err.message)
          reject(err)
        }
      })
    })
  }


  private async refreshCronTasksFileCache(): Promise<CronTaskDTO[]> {
    const { cronTasks, cronTaskFileAge } = await loadcronTasks()

    // Met à jour le cache interne
    this.cronTasks = cronTasks
    this._cronTaskFileAge = cronTaskFileAge

    this.logger.debug('Cron cache refreshed (tasks, file age).')
    return cronTasks
  }
}
