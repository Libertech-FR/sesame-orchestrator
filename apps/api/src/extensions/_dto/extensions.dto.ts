import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsString, ValidateNested } from 'class-validator'

/**
 * DTO pour une entrée d'extension dans la liste des extensions.
 *
 * Représente une extension individuelle avec son chemin et son état d'activation.
 *
 * @class ExtensionsListV1
 *
 * @description
 * Chaque entrée définit :
 * - Le chemin vers le répertoire contenant l'extension
 * - L'état d'activation (activée ou désactivée)
 *
 * Les extensions désactivées sont ignorées au chargement même si leur
 * configuration est présente dans la liste.
 */
export class ExtensionsListV1 {
  /**
   * Chemin vers le répertoire de l'extension.
   * Chemin relatif ou absolu contenant le fichier extension.yml et les modules.
   *
   * @type {string}
   * @required
   * @example "./extensions/auth-ldap", "/var/extensions/custom-dashboard"
   */
  @IsString()
  public path: string

  /**
   * Indique si l'extension est activée.
   * Si false, l'extension ne sera pas chargée au démarrage.
   *
   * @type {boolean}
   * @required
   * @default true
   */
  @IsBoolean()
  public enabled: boolean
}

/**
 * DTO principal pour le fichier de liste des extensions (v1).
 *
 * Ce DTO représente le fichier de configuration global qui référence toutes
 * les extensions disponibles dans le système (typiquement list.yml).
 * Il permet de gérer centralement quelles extensions sont chargées.
 *
 * @class ExtensionsFileV1
 *
 * @description
 * Le fichier de liste des extensions permet de :
 * - Référencer toutes les extensions disponibles dans le système
 * - Activer ou désactiver des extensions sans les supprimer
 * - Gérer l'ordre de chargement des extensions (selon l'ordre de la liste)
 * - Maintenir une configuration centralisée des extensions
 *
 * Au démarrage, le système :
 * 1. Lit le fichier list.yml
 * 2. Parcourt chaque extension activée
 * 3. Charge le fichier extension.yml de chaque extension
 * 4. Initialise les modules définis dans chaque extension
 *
 * @example
 * ```typescript
 * // Fichier list.yml
 * {
 *   version: "1",
 *   list: [
 *     {
 *       path: "./extensions/auth-ldap",
 *       enabled: true
 *     },
 *     {
 *       path: "./extensions/custom-dashboard",
 *       enabled: true
 *     },
 *     {
 *       path: "./extensions/beta-feature",
 *       enabled: false  // Extension désactivée
 *     }
 *   ]
 * }
 * ```
 */
export class ExtensionsFileV1 {
  /**
   * Version du format de fichier de liste d'extensions.
   * Actuellement seule la version "1" est supportée.
   *
   * @type {string}
   * @required
   * @enum "1"
   */
  @IsEnum(['1'])
  public version: string

  /**
   * Liste des extensions référencées avec leur état d'activation.
   * Chaque entrée contient le chemin vers l'extension et son état.
   *
   * @type {ExtensionsListV1[]}
   * @required
   */
  @ValidateNested({ each: true })
  @Type(() => ExtensionsListV1)
  public list: ExtensionsListV1[]
}
