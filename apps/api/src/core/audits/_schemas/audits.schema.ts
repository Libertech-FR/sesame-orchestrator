import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema'
import { AgentPart, AgentPartSchema } from './_parts/agent.parts.schema'
import { ChangesType } from '~/_common/plugins/mongoose/history.plugin'

/**
 * Énumération des types d'opérations auditées.
 *
 * @enum {string}
 */
export enum AuditOperation {
  /** Insertion d'un nouvel enregistrement */
  INSERT = 'insert',
  /** Mise à jour d'un enregistrement existant */
  UPDATE = 'update',
  /** Suppression d'un enregistrement */
  DELETE = 'delete',
  /** Remplacement complet d'un enregistrement */
  REPLACE = 'replace',
}

/**
 * Type combiné pour les documents d'audit avec les fonctionnalités Mongoose.
 */
export type AuditsDocument = Audits & Document

/**
 * Schéma Mongoose principal pour les audits.
 *
 * Ce schéma stocke l'historique complet de toutes les modifications apportées
 * aux enregistrements du système. Les entrées d'audit sont créées automatiquement
 * par le plugin Mongoose d'historique qui intercepte les opérations de base de données.
 *
 * @class Audits
 * @extends {AbstractSchema}
 *
 * @description
 * Chaque entrée d'audit enregistre :
 * - La collection et l'identifiant du document modifié
 * - Le type d'opération effectuée (insert, update, delete, replace)
 * - L'agent qui a effectué l'action (utilisateur ou système)
 * - L'état complet du document après l'opération (data)
 * - Le détail des changements pour les mises à jour (changes)
 * - Les métadonnées héritées d'AbstractSchema (dates de création, modification, etc.)
 *
 * Ces informations permettent :
 * - De consulter l'historique complet d'un enregistrement
 * - D'auditer les actions des utilisateurs
 * - D'effectuer un rollback en restaurant une version antérieure
 * - D'analyser les modifications pour détecter des anomalies
 *
 * @example
 * ```typescript
 * {
 *   coll: "users",
 *   documentId: ObjectId("507f1f77bcf86cd799439011"),
 *   op: "update",
 *   agent: {
 *     $ref: "agents",
 *     id: ObjectId("507f1f77bcf86cd799439012"),
 *     name: "john.doe"
 *   },
 *   data: { username: "john.doe", email: "new@example.com" },
 *   changes: [],
 *   createdAt: ISODate("2025-11-25T10:00:00Z")
 * }
 * ```
 */
@Schema({ versionKey: false, collection: 'audits' })
export class Audits extends AbstractSchema {
  /**
   * Nom de la collection MongoDB du document audité.
   * Permet d'identifier le type d'enregistrement concerné par l'audit.
   *
   * @type {string}
   * @example "users", "agents", "tasks"
   */
  @Prop({
    type: String,
    required: true,
  })
  public coll!: string

  /**
   * Identifiant unique du document audité dans sa collection.
   * Permet de retrouver l'enregistrement concerné par cette entrée d'audit.
   *
   * @type {Types.ObjectId}
   */
  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  public documentId!: Types.ObjectId

  /**
   * Type d'opération effectuée sur le document.
   * Détermine la nature de la modification auditée.
   *
   * @type {'insert' | 'update' | 'delete' | 'replace'}
   * @see {AuditOperation}
   */
  @Prop({
    type: String,
    required: true,
    enum: AuditOperation,
  })
  public op!: 'insert' | 'update' | 'delete' | 'replace'

  /**
   * Agent (utilisateur ou système) qui a effectué l'opération.
   * Contient la référence et l'identifiant de l'agent responsable de la modification.
   *
   * @type {AgentPart}
   * @see {AgentPart}
   */
  @Prop({
    type: AgentPartSchema,
    required: true,
  })
  public agent!: AgentPart

  /**
   * État complet du document après l'opération.
   * Pour les insertions et mises à jour, contient l'état final du document.
   * Pour les suppressions, peut contenir l'état avant suppression.
   *
   * @type {Document}
   * @optional
   */
  @Prop({ type: Object })
  public data?: Document

  /**
   * Détail des changements effectués lors d'une mise à jour.
   * Tableau contenant chaque champ modifié avec ses valeurs avant/après.
   * Uniquement présent pour les opérations de type UPDATE.
   *
   * @type {ChangesType[]}
   * @optional
   */
  @Prop({ type: Array, of: Object })
  public changes?: ChangesType[]
}

/**
 * Factory pour créer le schéma Mongoose à partir de la classe Audits.
 */
export const AuditsSchema = SchemaFactory.createForClass(Audits)
