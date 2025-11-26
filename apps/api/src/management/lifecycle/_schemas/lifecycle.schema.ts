import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema'
import { IdentityLifecycleDefault } from '~/management/identities/_enums/lifecycle.enum'

/**
 * Type de document Mongoose pour les événements de cycle de vie
 *
 * @typedef {Lifecycle & Document} LifecycleDocument
 * @description Combine le schéma Lifecycle avec le type Document de Mongoose,
 * fournissant l'accès aux méthodes et propriétés du document MongoDB.
 */
export type LifecycleDocument = Lifecycle & Document

/**
 * Nom de la propriété de référence vers l'identité
 *
 * @constant {string}
 * @description Constante utilisée pour référencer le champ refId de manière type-safe
 * dans les requêtes et les index. Évite les erreurs de frappe dans le code.
 *
 * @example
 * LifecycleModel.findOne({ [LifecycleRefId]: identityId })
 */
export const LifecycleRefId = 'refId'

/**
 * Schéma Mongoose pour les événements de cycle de vie
 *
 * @class Lifecycle
 * @extends AbstractSchema
 * @description Modèle de données pour l'historique des changements d'état du cycle de vie.
 * Stocke chaque transition d'état avec la référence à l'identité concernée,
 * le nouvel état et la date de l'événement.
 *
 * Configuration du schéma :
 * - versionKey: false - Désactive le champ __v de versioning
 * - minimize: false - Conserve les objets vides dans les documents
 *
 * @example
 * {
 *   _id: ObjectId('...'),
 *   refId: ObjectId('507f1f77bcf86cd799439011'),
 *   lifecycle: 'OFFICIAL',
 *   date: ISODate('2025-11-26T10:00:00Z'),
 *   createdAt: ISODate('2025-11-26T10:00:00Z'),
 *   updatedAt: ISODate('2025-11-26T10:00:00Z')
 * }
 */
@Schema({ versionKey: false, minimize: false })
export class Lifecycle extends AbstractSchema {
  /**
   * Référence MongoDB vers l'identité concernée
   *
   * @type {Types.ObjectId}
   * @description Identifiant de l'identité à laquelle cet événement de cycle de vie
   * est associé. Référence la collection 'Identities' permettant de récupérer
   * l'historique complet des changements d'état pour une identité donnée.
   *
   * Propriétés :
   * - type: Types.ObjectId - Type ObjectId de MongoDB
   * - ref: 'Identities' - Référence à la collection Identities pour les populations
   * - required: true - Champ obligatoire
   *
   * @example ObjectId('507f1f77bcf86cd799439011')
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Identities',
    required: true,
  })
  public refId: Types.ObjectId

  /**
   * État du cycle de vie
   *
   * @type {IdentityLifecycleDefault | string}
   * @description Valeur de l'état de cycle de vie dans lequel l'identité se trouve.
   * Peut être une valeur de l'énumération IdentityLifecycleDefault (OFFICIAL, MANUAL, etc.)
   * ou une chaîne personnalisée pour les états configurés dynamiquement.
   *
   * Propriétés :
   * - type: String - Stocké comme chaîne de caractères
   * - required: true - Champ obligatoire
   *
   * @example 'OFFICIAL', 'MANUAL', 'ARCHIVED', 'A' (clé d'état personnalisée)
   */
  @Prop({
    type: String,
    required: true,
  })
  public lifecycle: IdentityLifecycleDefault | string

  /**
   * Date de l'événement de cycle de vie
   *
   * @type {Date}
   * @description Horodatage de l'événement de cycle de vie. Représente le moment
   * où le changement d'état a eu lieu. Par défaut, utilise la date courante.
   * Utilisé pour l'historique et le calcul des transitions automatiques basées sur le temps.
   *
   * Propriétés :
   * - type: Date - Type Date de MongoDB
   * - default: Date.now - Valeur par défaut à la date courante
   *
   * @example ISODate('2025-11-26T10:00:00Z')
   */
  @Prop({
    type: Date,
    default: Date.now,
  })
  public date: Date
}

/**
 * Factory Mongoose pour le schéma Lifecycle
 *
 * @constant {MongooseSchema}
 * @description Schéma Mongoose généré à partir de la classe Lifecycle.
 * Utilisé pour créer le modèle MongoDB et définir les index, middlewares et méthodes.
 *
 * @example
 * // Utilisation dans un module
 * MongooseModule.forFeature([{ name: Lifecycle.name, schema: LifecycleSchema }])
 */
export const LifecycleSchema = SchemaFactory.createForClass(Lifecycle)
