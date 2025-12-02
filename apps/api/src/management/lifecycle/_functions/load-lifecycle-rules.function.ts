import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { plainToInstance } from 'class-transformer'
import { parse } from 'yaml'
import { validateOrReject } from 'class-validator'
import { ConfigRulesObjectSchemaDTO } from '../_dto/config-rules.dto'
import { formatValidationErrors } from './format-validation-errors.function'
import { Logger } from '@nestjs/common'

// Cache en mémoire pour les règles de cycle de vie
// Basé sur une "signature" dérivée des mtime des fichiers YAML de rules
let __lifecycleRulesCache: ConfigRulesObjectSchemaDTO[] | null = null
let __lifecycleRulesCacheSignature: string | null = null

/**
 * Charge les règles de cycle de vie depuis les fichiers de configuration
 *
 * @export
 * @async
 * @function loadLifecycleRules
 * @param {Logger} logger - Instance du logger pour tracer les opérations
 * @returns {Promise<ConfigRulesObjectSchemaDTO[]>} Tableau des règles chargées et validées
 *
 * @description Lit tous les fichiers YAML depuis `configs/lifecycle/rules`,
 * les parse en DTOs, les valide avec class-validator et les retourne.
 * Chaque fichier doit contenir une structure conforme au schéma ConfigRulesObjectSchemaDTO.
 *
 * Processus :
 * 1. Scan du répertoire configs/lifecycle/rules
 * 2. Lecture de chaque fichier .yml/.yaml
 * 3. Parsing YAML vers objet JavaScript
 * 4. Transformation en DTO avec class-transformer
 * 5. Validation avec class-validator
 * 6. Retour du tableau de règles valides
 *
 * @throws {Error} Si la validation d'un fichier échoue
 *
 * @example
 * const rules = await loadLifecycleRules(logger);
 * // Charge tous les fichiers .yml depuis configs/lifecycle/rules/
 * // Valide la structure de chaque fichier
 * // Retourne les règles pour utilisation par le cron
 */
export async function loadLifecycleRules(): Promise<ConfigRulesObjectSchemaDTO[]> {
  const logger = new Logger(loadLifecycleRules.name)

  let files: string[] = []

  const lifecycleRules: ConfigRulesObjectSchemaDTO[] = []
  logger.verbose('Loading lifecycle rules from configuration files...')
  logger.verbose('Initializing LifecycleService...')

  const rulesDir = `${process.cwd()}/configs/lifecycle/rules`

  if (!existsSync(rulesDir)) {
    logger.warn(`Rules directory does not exist: ${rulesDir}. Returning empty rules array.`)
    return []
  }

  try {
    files = readdirSync(rulesDir)
  } catch (error) {
    logger.error('Error reading lifecycle files', error.message, error.stack)
    return []
  }

  // Construire une signature du set de fichiers (nom + mtimeMs) pour le cache
  const yamlFiles = files.filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  const signatureParts: string[] = []
  for (const file of yamlFiles) {
    try {
      const { mtimeMs } = statSync(`${rulesDir}/${file}`)
      signatureParts.push(`${file}:${mtimeMs}`)
    } catch {
      // Si on ne peut pas lire le mtime, on ignore ce fichier dans la signature
      signatureParts.push(`${file}:0`)
    }
  }
  const currentSignature = signatureParts.sort().join('|')

  // Si la signature n'a pas changé et un cache existe, retourner le cache
  if (__lifecycleRulesCache && __lifecycleRulesCacheSignature === currentSignature) {
    logger.debug('Returning cached lifecycle rules (rules files unchanged)')
    return __lifecycleRulesCache
  }

  for (const file of files) {
    let schema: ConfigRulesObjectSchemaDTO
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
      logger.warn(`Skipping non-YAML file: ${file}`)
      continue
    }

    try {
      const data = readFileSync(`${rulesDir}/${file}`, 'utf-8')
      logger.debug(`Loaded lifecycle config: ${file}`)
      const yml = parse(data)
      schema = plainToInstance(ConfigRulesObjectSchemaDTO, yml)

    } catch (error) {
      logger.error(`Error loading lifecycle config file: ${file}`, error.message, error.stack)
      continue
    }

    if (!schema || !schema.identities || !Array.isArray(schema.identities)) {
      logger.error(`Invalid schema in file: ${file}`)
      continue
    }

    try {
      logger.verbose(`Validating schema for file: ${file}`, JSON.stringify(schema, null, 2))
      await validateOrReject(schema, {
        whitelist: true,
      })
      logger.debug(`Validated schema for file: ${file}`)
    } catch (errors) {
      const formattedErrors = formatValidationErrors(errors, file)
      const err = new Error(`Validation errors in file '${file}':\n${formattedErrors}`)
      throw err
    }

    lifecycleRules.push(schema)
    logger.debug(`Lifecycle activated from file: ${file}`)
  }

  logger.log(`Loaded <${lifecycleRules.length}> lifecycle rules from configuration files.`)
  // Mettre à jour le cache après chargement
  __lifecycleRulesCache = lifecycleRules
  __lifecycleRulesCacheSignature = currentSignature
  return lifecycleRules
}
