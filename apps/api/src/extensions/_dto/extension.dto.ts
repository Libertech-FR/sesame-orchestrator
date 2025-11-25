import { Type } from 'class-transformer'
import { IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator'

/**
 * DTO pour les métadonnées de service d'une extension (app ou service).
 *
 * Définit la configuration pour charger et intégrer un module d'extension
 * dans l'application ou le service.
 *
 * @class ExtensionSettingsAppServiceMetadataV1
 *
 * @description
 * Cette classe configure :
 * - Le chemin cible du module d'extension à charger
 * - Le nom du module principal à importer (par défaut 'ExtensionModule')
 */
export class ExtensionSettingsAppServiceMetadataV1 {
  /**
   * Chemin cible du module d'extension.
   * Chemin relatif ou absolu vers le fichier compilé du module.
   *
   * @type {string}
   * @required
   * @example "./dist/my-extension", "/path/to/extension"
   */
  @IsDefined()
  @IsString()
  public target: string

  /**
   * Nom du module principal à importer depuis l'extension.
   * Par défaut, recherche 'ExtensionModule' comme point d'entrée.
   *
   * @type {string}
   * @optional
   * @default "ExtensionModule"
   */
  @IsOptional()
  @IsString()
  public mainModule: string = 'ExtensionModule'
}

/**
 * DTO pour les paramètres de configuration d'une extension.
 *
 * Définit les configurations séparées pour l'application (frontend)
 * et le service (backend) si l'extension nécessite d'être chargée
 * dans les deux environnements.
 *
 * @class ExtensionSettingsMetadataV1
 *
 * @description
 * Permet de configurer des extensions qui peuvent :
 * - S'intégrer uniquement côté application (frontend)
 * - S'intégrer uniquement côté service (backend)
 * - S'intégrer des deux côtés avec des modules différents
 */
export class ExtensionSettingsMetadataV1 {
  /**
   * Configuration pour le chargement côté application (frontend).
   *
   * @type {ExtensionSettingsAppServiceMetadataV1}
   */
  @ValidateNested()
  @Type(() => ExtensionSettingsAppServiceMetadataV1)
  public app: ExtensionSettingsAppServiceMetadataV1

  /**
   * Configuration pour le chargement côté service (backend).
   *
   * @type {ExtensionSettingsAppServiceMetadataV1}
   */
  @ValidateNested()
  @Type(() => ExtensionSettingsAppServiceMetadataV1)
  public service: ExtensionSettingsAppServiceMetadataV1
}

/**
 * DTO pour les informations descriptives d'une extension.
 *
 * Contient les métadonnées d'identification et de version de l'extension.
 *
 * @class ExtensionInformationMetadataV1
 *
 * @description
 * Ces informations permettent :
 * - L'identification unique de l'extension
 * - Le suivi de la version pour la gestion des mises à jour
 * - L'attribution de l'extension à son auteur
 */
export class ExtensionInformationMetadataV1 {
  /**
   * Nom de l'extension.
   * Identifiant unique et descriptif de l'extension.
   *
   * @type {string}
   * @required
   * @example "authentication-ldap", "custom-dashboard"
   */
  @IsString()
  public name: string

  /**
   * Auteur de l'extension.
   *
   * @type {string}
   * @required
   * @example "John Doe", "ACME Corporation"
   */
  @IsString()
  public author: string

  /**
   * Version de l'extension.
   * Format semantic versioning recommandé (MAJOR.MINOR.PATCH).
   *
   * @type {string}
   * @required
   * @example "1.0.0", "2.3.1"
   */
  @IsString()
  public version: string
}

/**
 * DTO principal pour le fichier de configuration d'une extension (v1).
 *
 * Ce DTO représente la structure complète du fichier de métadonnées d'une extension
 * (typiquement extension.yml). Il définit comment l'extension doit être chargée,
 * intégrée et identifiée dans le système.
 *
 * @class ExtensionFileV1
 *
 * @description
 * Une extension est un plugin qui permet d'ajouter des fonctionnalités personnalisées
 * à l'application sans modifier le code source principal. Les extensions peuvent :
 * - Ajouter de nouveaux endpoints API
 * - Enrichir les fonctionnalités existantes via des hooks
 * - Intégrer des services tiers
 * - Personnaliser le comportement de l'application
 * - Ajouter des interfaces utilisateur personnalisées
 *
 * Le système de chargement d'extensions permet :
 * - Le chargement dynamique au démarrage de l'application
 * - L'isolation des extensions dans leurs propres modules
 * - La configuration séparée pour frontend et backend
 * - La gestion des versions et des dépendances
 *
 * @example
 * ```typescript
 * // Fichier extension.yml
 * {
 *   version: "1",
 *   information: {
 *     name: "custom-auth-extension",
 *     author: "Security Team",
 *     version: "1.0.0"
 *   },
 *   settings: {
 *     app: {
 *       target: "./dist/client",
 *       mainModule: "CustomAuthClientModule"
 *     },
 *     service: {
 *       target: "./dist/server",
 *       mainModule: "CustomAuthServerModule"
 *     }
 *   }
 * }
 * ```
 */
export class ExtensionFileV1 {
  /**
   * Version du format de fichier d'extension.
   * Actuellement seule la version "1" est supportée.
   *
   * @type {string}
   * @required
   * @enum "1"
   */
  @IsDefined()
  @IsEnum(['1'])
  public version: string

  /**
   * Informations descriptives de l'extension.
   * Contient le nom, l'auteur et la version de l'extension.
   *
   * @type {ExtensionInformationMetadataV1}
   * @required
   */
  @IsDefined()
  @ValidateNested()
  @Type(() => ExtensionInformationMetadataV1)
  public information: ExtensionInformationMetadataV1

  /**
   * Paramètres de configuration pour le chargement de l'extension.
   * Définit comment charger l'extension côté application et service.
   *
   * @type {ExtensionSettingsMetadataV1}
   * @required
   */
  @IsDefined()
  @ValidateNested()
  @Type(() => ExtensionSettingsMetadataV1)
  public settings: ExtensionSettingsMetadataV1
}
