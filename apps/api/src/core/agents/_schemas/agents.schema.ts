import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema'
import { StatePart, StatePartSchema } from '~/core/agents/_schemas/_parts/state.part.schema'
import { SecurityPart, SecurityPartSchema } from '~/core/agents/_schemas/_parts/security.part.schema'
import { MixedValue } from '~/_common/types/mixed-value.type'
import { historyPlugin } from '~/_common/plugins/mongoose/history.plugin'

/**
 * Méthode d'authentification par défaut pour les agents.
 * @constant {string}
 */
const DEFAULT_THIRD_PARTY_AUTH = 'local'

/**
 * Schéma Mongoose pour les agents.
 *
 * Ce schéma définit la structure des agents du système, qui sont les entités
 * pouvant s'authentifier et effectuer des actions. Il inclut les informations
 * d'identification, d'authentification, de sécurité et d'état des agents.
 *
 * @class Agents
 * @extends {AbstractSchema}
 *
 * @description
 * Un agent représente un utilisateur ou un système automatisé capable de :
 * - S'authentifier via username/email et mot de passe (haché avec Argon2)
 * - Utiliser une authentification tierce (OAuth, SAML, etc.)
 * - Avoir un état de lifecycle (actif, inactif, suspendu, etc.)
 * - Posséder une clé secrète pour les opérations cryptographiques
 * - Stocker des champs personnalisés pour des besoins métier spécifiques
 *
 * Sécurité :
 * - Le mot de passe est automatiquement haché avec Argon2 lors de la création/modification
 * - Une clé secrète unique est générée à la création pour chaque agent
 * - Le plugin d'historique enregistre toutes les modifications (sauf le mot de passe)
 *
 * @example
 * ```typescript
 * {
 *   username: "john.doe",
 *   displayName: "John Doe",
 *   email: "john.doe@example.com",
 *   password: "$argon2id$v=19$m=...", // Haché automatiquement
 *   thirdPartyAuth: "local",
 *   state: { current: "active" },
 *   baseURL: "/",
 *   security: { secretKey: "a1b2c3..." },
 *   customFields: { department: "IT" }
 * }
 * ```
 */
@Schema({ versionKey: false })
export class Agents extends AbstractSchema {
  /**
   * Nom d'utilisateur unique de l'agent.
   * Utilisé pour l'authentification et l'identification.
   *
   * @type {string}
   * @required
   * @unique
   */
  @Prop({
    type: String,
    required: true,
    unique: true,
  })
  public username: string

  /**
   * Nom d'affichage de l'agent.
   * Nom complet ou nom convivial affiché dans l'interface utilisateur.
   *
   * @type {string}
   * @optional
   */
  @Prop({
    type: String,
  })
  public displayName: string

  /**
   * Adresse email unique de l'agent.
   * Utilisée pour l'authentification et les communications.
   *
   * @type {string}
   * @required
   * @unique
   */
  @Prop({
    type: String,
    required: true,
    unique: true,
  })
  public email: string

  /**
   * Mot de passe haché de l'agent.
   * Automatiquement haché avec Argon2 lors de la création ou modification.
   * Le champ n'est jamais retourné dans les réponses API et n'est pas audité.
   *
   * @type {string}
   * @required
   * @private
   */
  @Prop({
    type: String,
    required: true,
  })
  public password: string

  /**
   * Méthode d'authentification tierce utilisée.
   * Permet l'intégration avec des systèmes d'authentification externes.
   *
   * @type {string}
   * @default "local"
   * @example "local", "oauth2", "saml", "ldap"
   */
  @Prop({
    type: String,
    default: DEFAULT_THIRD_PARTY_AUTH,
  })
  public thirdPartyAuth: string

  /**
   * État de lifecycle de l'agent.
   * Permet de gérer les différents états (actif, inactif, suspendu, etc.)
   * et les transitions entre ces états.
   *
   * @type {StatePart}
   * @required
   * @default {}
   * @see {StatePart}
   */
  @Prop({
    type: StatePartSchema,
    required: true,
    default: {},
  })
  public state: StatePart

  /**
   * URL de base pour l'agent.
   * Utilisée pour définir le contexte ou l'espace de travail de l'agent.
   *
   * @type {string}
   * @default "/"
   */
  @Prop({
    type: String,
    default: '/',
  })
  public baseURL: string

  /**
   * Informations de sécurité de l'agent.
   * Contient la clé secrète et autres paramètres de sécurité.
   *
   * @type {SecurityPart}
   * @optional
   * @see {SecurityPart}
   */
  @Prop({
    type: SecurityPartSchema,
  })
  public security: SecurityPart

  /**
   * Champs personnalisés définis par l'utilisateur.
   * Permet de stocker des données métier spécifiques sans modifier le schéma.
   *
   * @type {Object.<string, MixedValue>}
   * @optional
   * @example
   * ```typescript
   * {
   *   department: "IT",
   *   employeeId: "EMP-12345",
   *   permissions: ["read", "write"]
   * }
   * ```
   */
  @Prop({
    type: Object,
  })
  public customFields?: { [key: string]: MixedValue }
}

/**
 * Factory pour créer le schéma Mongoose à partir de la classe Agents.
 *
 * Le schéma est configuré avec le plugin d'historique qui enregistre
 * automatiquement toutes les modifications dans la collection d'audits,
 * à l'exception du champ password pour des raisons de sécurité.
 */
export const AgentsSchema = SchemaFactory.createForClass(Agents)
  .plugin(historyPlugin, {
    collectionName: Agents.name,
    ignoredFields: [
      'password',
    ],
  })
