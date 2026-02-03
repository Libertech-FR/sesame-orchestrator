import { readFileSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { plainToInstance } from 'class-transformer'
import { parse } from 'yaml'
import { validateOrReject } from 'class-validator'
import { Logger } from '@nestjs/common'
import { formatValidationErrors } from '~/_common/functions/format-validation-errors.function'
import { CronTaskDTO } from '../_dto/config-task.dto'
import { ConfigTaskDTO } from '../_dto/config-task.dto'

// Cache simple en mémoire pour éviter les relectures inutiles des fichiers cron
// Le cache est invalidé automatiquement si la date de modification (mtimeMs) change.
let __cronTaskCache: LoadCronTasksResult | null = null
let __cronTaskCacheMtime: number | null = null

/**
 * Résultat du chargement des tâches cron
 *
 * @interface LoadCronTasksResult
 * @property {CronTaskDTO[]} cronTasks - Tableau des tâches cron chargées
 * @property {number} cronTaskFileAge - Timestamp de la dernière modification du fichier
 */
export interface LoadCronTasksResult {
  cronTasks: CronTaskDTO[]
  cronTaskFileAge: number
}

/**
 * Charge les tâches cron depuis le fichier cron/*.yml
 *
 * @export
 * @async
 * @function loadcronTasks
 * @returns {Promise<LoadCronTasksResult>} Objet contenant les tâches chargées et l'âge du fichier
 */
export async function loadcronTasks(): Promise<LoadCronTasksResult> {
  const logger = new Logger(loadcronTasks.name)

  const cronTasks: CronTaskDTO[] = []
  let cronTaskFileAge = 0
  logger.verbose('Starting to load cron tasks from configs/cron/*.yml')

  try {
    const cronDir = join(process.cwd(), 'configs', 'cron')
    const files = readdirSync(cronDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))

    if (files.length === 0) {
      logger.warn('No cron YAML files found in configs/cron')
      return { cronTasks, cronTaskFileAge }
    }

    // Déterminer le mtime le plus récent parmi les fichiers pour le cache
    let latestMtime = 0
    for (const fname of files) {
      const filePath = join(cronDir, fname)
      const { mtimeMs } = statSync(filePath)
      if (mtimeMs > latestMtime) latestMtime = mtimeMs
    }

    if (__cronTaskCache && __cronTaskCacheMtime === latestMtime) {
      logger.debug('Returning cached cron tasks (cron tasks unchanged)')
      return __cronTaskCache
    }

    // Lire, valider et fusionner les tasks de chaque fichier
    const usedKeys = new Set<string>()
    for (const fname of files) {
      const filePath = join(cronDir, fname)
      logger.verbose(`Loading cron tasks from <${filePath}>`)
      const data = readFileSync(filePath, 'utf-8')
      const yml = parse(data)
      const configTasks = plainToInstance(ConfigTaskDTO, yml)

      if (!configTasks || !configTasks.tasks || !Array.isArray(configTasks.tasks)) {
        logger.error(`Invalid cron tasks format in ${fname}`)
        continue
      }

      try {
        logger.verbose(`Validating schema for ${fname}`, JSON.stringify(configTasks, null, 2))
        await validateOrReject(configTasks, { whitelist: true })
        logger.debug(`Validated schema for ${fname}`)
      } catch (errors) {
        const formattedErrors = formatValidationErrors(errors, fname)
        throw new Error(`Validation errors in ${fname}:\n${formattedErrors}`)
      }

      for (const task of configTasks.tasks) {
        if (usedKeys.has(task.name)) {
          throw new Error(`Duplicate task name '${task.name}' found across cron YAML files (conflict in ${fname})`)
        }
        usedKeys.add(task.name)
        cronTasks.push(task as CronTaskDTO)
      }
    }

    cronTaskFileAge = latestMtime
    logger.log(`Loaded <${cronTasks.length}> cron tasks from configs/cron/*.yml`)

    // Mettre à jour le cache après chargement et validation réussis
    __cronTaskCache = { cronTasks, cronTaskFileAge }
    __cronTaskCacheMtime = cronTaskFileAge

  } catch (error) {
    logger.error('Error loading cron tasks from configs/cron/*.yml', error.message, error.stack)
    // En cas d'erreur, ne pas empoisonner le cache : on l'invalide
    __cronTaskCache = null
    __cronTaskCacheMtime = null
  }

  return { cronTasks, cronTaskFileAge }
}
