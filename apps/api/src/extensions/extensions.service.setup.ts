import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { parse } from 'yaml'
import { ExtensionFileV1 } from './_dto/extension.dto'
import { ExtensionsFileV1, ExtensionsListV1 } from './_dto/extensions.dto'
import { plainToInstance } from 'class-transformer'
import { validateOrReject } from 'class-validator'
import * as process from 'process'
import { DynamicModule, Logger } from '@nestjs/common'

/**
 * Liste des modules d'extension chargés dynamiquement.
 * @type {DynamicModule[]}
 */
const serviceList: DynamicModule[] = []

/**
 * Nom du fichier de configuration d'une extension.
 * @constant {string}
 */
export const EXTENSION_FILE_INFO = 'extension.yml'

/**
 * Chemin vers le fichier de liste des extensions.
 * @constant {string}
 */
export const EXTENSIONS_FILE_PATH = join(process.cwd(), '/extensions/list.yml')

/**
 * Parse et valide le fichier de liste des extensions.
 *
 * Lit le fichier list.yml, le valide selon le schéma ExtensionsFileV1
 * et retourne la liste des extensions configurées.
 *
 * @async
 * @returns {Promise<ExtensionsListV1[]>} Liste des extensions avec leur configuration
 * @throws {Error} Si le fichier est invalide ou ne respecte pas le schéma
 *
 * @description
 * Processus de validation :
 * 1. Lecture du fichier list.yml
 * 2. Parsing YAML en objet JavaScript
 * 3. Transformation en instance de classe avec class-transformer
 * 4. Validation du schéma avec class-validator
 * 5. Retour de la liste des extensions si valide
 */
export async function parseExtensionsList(): Promise<ExtensionsListV1[]> {
  const data = readFileSync(EXTENSIONS_FILE_PATH, 'utf8')
  const yml = parse(data)
  const schema = plainToInstance(ExtensionsFileV1, yml)
  try {
    await validateOrReject(schema, {
      whitelist: true,
    })
  } catch (errors) {
    const err = new Error(`Invalid extensions`)
    err.message = errors.map((e) => e.toString()).join(', ') //TODO: improve error message
    throw err
  }

  return yml.list
}

/**
 * Parse et valide le fichier de configuration d'une extension.
 *
 * Lit le fichier extension.yml d'une extension spécifique et le valide
 * selon le schéma ExtensionFileV1.
 *
 * @async
 * @param {string} path - Chemin vers le répertoire de l'extension
 * @returns {Promise<ExtensionFileV1>} Configuration complète de l'extension
 * @throws {Error} Si le fichier n'existe pas ou est invalide
 *
 * @description
 * Cette fonction :
 * 1. Lit le fichier extension.yml dans le répertoire spécifié
 * 2. Parse le contenu YAML
 * 3. Transforme en instance ExtensionFileV1
 * 4. Retourne la configuration validée
 */
export async function extensionParseFile(path: string): Promise<ExtensionFileV1> {
  Logger.log('Extension file found, validating...', 'extensionParseFile')
  const data = readFileSync(`${path}/${EXTENSION_FILE_INFO}`, 'utf8')
  const yml = parse(data)
  return plainToInstance(ExtensionFileV1, yml)
}

/**
 * Fonction principale de configuration et chargement des extensions.
 *
 * Cette fonction asynchrone charge toutes les extensions activées depuis
 * le fichier list.yml et retourne les modules prêts à être importés par NestJS.
 *
 * @async
 * @default
 * @returns {Promise<DynamicModule[]>} Liste des modules d'extension chargés
 *
 * @description
 * Processus de chargement complet :
 * 1. Vérifie l'existence du fichier list.yml
 * 2. Parse et valide la liste des extensions
 * 3. Pour chaque extension activée :
 *    a. Lit et valide son fichier extension.yml
 *    b. Vérifie qu'elle a une cible service définie
 *    c. Import dynamiquement le module depuis le chemin spécifié
 *    d. Récupère le module principal (par défaut 'ExtensionModule')
 *    e. Ajoute le module à la liste
 * 4. Retourne tous les modules chargés
 *
 * Gestion des erreurs :
 * - Extension désactivée : Log et skip
 * - Pas de cible service : Warning et skip
 * - Module principal introuvable : Warning et skip
 * - Erreur de chargement : Error log avec trace
 * - Erreur critique : Exit du processus avec code 1
 *
 * Logging détaillé :
 * - Info : Fichier trouvé, validation en cours
 * - Info : Extension activée avec succès
 * - Warning : Extension désactivée ou configuration incomplète
 * - Error : Échec de chargement avec stack trace
 */
export default async function (): Promise<DynamicModule[]> {
  try {
    if (existsSync(EXTENSIONS_FILE_PATH)) {
      Logger.log('Extensions file found, validating...', 'parsingAppExtensions')
      const list = await parseExtensionsList()

      for (const extension of list) {
        if (!extension.enabled) {
          Logger.log(`Extension ${extension.path} is disabled`, 'ExtensionServiceSetup')
          continue
        }
        const extensionPath = `${process.cwd()}/extensions/${extension.path}`
        const extensionFile = await extensionParseFile(extensionPath)
        if (!extensionFile.settings.service.target) {
          Logger.warn(`Extension ${extensionFile.information.name} has no service target`, 'ExtensionServiceSetup')
          continue
        }
        const extensionServiceTarget = `${extensionPath}/${extensionFile.settings.service.target}`
        await import(extensionServiceTarget)
          .then((module) => {
            if (module[extensionFile.settings.service.mainModule]) {
              serviceList.push(module[extensionFile.settings.service.mainModule])
              Logger.log(`Extension ${extensionFile.information.name} is enabled`, 'ExtensionServiceSetup')
              return
            }
            Logger.warn(`Extension <${extensionFile.information.name}> module <${extensionFile.settings.service.mainModule}> has no main module`, 'ExtensionServiceSetup')
          })
          .catch((err) => {
            Logger.error(`Extension <${extensionFile.information.name}> located in <${extensionServiceTarget}> failed to load`, 'ExtensionServiceSetup')
            console.error(err)
            console.trace(err.stack)
          })
      }
    }
    return serviceList
  } catch (err) {
    Logger.error('Failed to load extensions', 'ExtensionServiceSetup')
    console.error(err)
    process.exit(1)
  }
}
