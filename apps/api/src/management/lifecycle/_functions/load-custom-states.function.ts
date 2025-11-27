import { readFileSync, statSync } from 'node:fs'
import { plainToInstance } from 'class-transformer'
import { parse } from 'yaml'
import { validateOrReject } from 'class-validator'
import { ConfigStatesDTO, LifecycleStateDTO } from '../_dto/config-states.dto'
import { formatValidationErrors } from './format-validation-errors.function'
import { IdentityLifecycleDefault } from '../../identities/_enums/lifecycle.enum'
import { Logger } from '@nestjs/common'

// Cache simple en mémoire pour éviter les relectures inutiles du fichier states.yml
// Le cache est invalidé automatiquement si la date de modification (mtimeMs) change.
let __customStatesCache: LoadCustomStatesResult | null = null
let __customStatesCacheMtime: number | null = null

/**
 * Résultat du chargement des états personnalisés
 *
 * @interface LoadCustomStatesResult
 * @property {LifecycleStateDTO[]} customStates - Tableau des états personnalisés chargés
 * @property {number} stateFileAge - Timestamp de la dernière modification du fichier
 */
export interface LoadCustomStatesResult {
  customStates: LifecycleStateDTO[]
  stateFileAge: number
}

/**
 * Charge les états personnalisés depuis le fichier states.yml
 *
 * @export
 * @async
 * @function loadCustomStates
 * @param {Logger} logger - Instance du logger pour tracer les opérations
 * @returns {Promise<LoadCustomStatesResult>} Objet contenant les états chargés et l'âge du fichier
 *
 * @description Lit le fichier states.yml depuis `configs/lifecycle`, le parse,
 * le valide et retourne les états personnalisés. Également retourne l'âge du fichier
 * pour le cache HTTP.
 *
 * Validations effectuées :
 * - Clé d'état doit être exactement 1 caractère
 * - Clés doivent être uniques
 * - Clés ne doivent pas entrer en conflit avec les états par défaut
 *
 * @throws {Error} Si la validation échoue ou si une clé est en conflit
 *
 * @example
 * const { customStates, stateFileAge } = await loadCustomStates(logger);
 * // Charge states.yml
 * // Valide que les clés sont uniques et non conflictuelles
 * // Retourne les états pour utilisation par l'API
 */
export async function loadCustomStates(): Promise<LoadCustomStatesResult> {
  const logger = new Logger(loadCustomStates.name)

  const customStates: LifecycleStateDTO[] = []
  let stateFileAge = 0
  logger.verbose('Loading custom lifecycle states from states.yml...')

  try {
    const statesFilePath = `${process.cwd()}/configs/lifecycle/states.yml`
    // Vérifier l'âge du fichier pour décider d'utiliser le cache
    const { mtimeMs } = statSync(statesFilePath)
    // Si le cache est présent et que le mtime n'a pas changé, retourner directement
    if (__customStatesCache && __customStatesCacheMtime === mtimeMs) {
      logger.debug('Returning cached custom lifecycle states (states.yml unchanged)')
      return __customStatesCache
    }

    const data = readFileSync(statesFilePath, 'utf-8')
    stateFileAge = mtimeMs
    logger.debug('Loaded custom states config: states.yml')

    const yml = parse(data)
    const configStates = plainToInstance(ConfigStatesDTO, yml)

    if (!configStates || !configStates.states || !Array.isArray(configStates.states)) {
      logger.error('Invalid schema in states.yml file')
      return { customStates, stateFileAge }
    }

    try {
      logger.verbose('Validating schema for states.yml', JSON.stringify(configStates, null, 2))
      await validateOrReject(configStates, {
        whitelist: true,
      })
      logger.debug('Validated schema for states.yml')
    } catch (errors) {
      const formattedErrors = formatValidationErrors(errors, 'states.yml')
      const err = new Error(`Validation errors in states.yml:\n${formattedErrors}`)
      throw err
    }

    // Valider que chaque clé est unique et d'une seule lettre
    const usedKeys = new Set<string>()
    for (const state of configStates.states) {
      if (state.key.length !== 1) {
        throw new Error(`State key '${state.key}' must be exactly one character`)
      }

      if (usedKeys.has(state.key)) {
        throw new Error(`Duplicate state key '${state.key}' found in states.yml`)
      }

      // Vérifier que la clé n'existe pas déjà dans l'enum par défaut
      if (Object.values(IdentityLifecycleDefault).includes(state.key as IdentityLifecycleDefault)) {
        throw new Error(`State key '${state.key}' conflicts with default lifecycle state`)
      }

      usedKeys.add(state.key)
      customStates.push(state)
    }

    logger.log(`Loaded <${customStates.length}> custom lifecycle states from states.yml`)

    // Mettre à jour le cache après chargement et validation réussis
    __customStatesCache = { customStates, stateFileAge }
    __customStatesCacheMtime = stateFileAge

  } catch (error) {
    logger.error('Error loading custom states from states.yml', error.message, error.stack)
    // En cas d'erreur, ne pas empoisonner le cache : on l'invalide
    __customStatesCache = null
    __customStatesCacheMtime = null
  }

  return { customStates, stateFileAge }
}
