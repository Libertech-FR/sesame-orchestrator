import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

/**
 * Schéma Mongoose pour la partie Agent des audits.
 *
 * Ce schéma représente les informations de l'agent (utilisateur ou système)
 * qui a effectué l'action auditée. Il est utilisé comme sous-document dans
 * les entrées d'audit pour tracer l'origine des modifications.
 *
 * @class AgentPart
 * @extends {Document}
 *
 * @description
 * Structure de l'agent :
 * - $ref : Référence au type de collection de l'agent (ex: "agents", "users", "system")
 * - id : Identifiant unique de l'agent dans sa collection
 * - name : Nom ou identifiant lisible de l'agent (optionnel)
 *
 * Note : Le schéma utilise `_id: false` car il est intégré comme sous-document
 * dans le schéma d'audit principal et n'a pas besoin de son propre identifiant.
 *
 * @example
 * ```typescript
 * {
 *   $ref: "agents",
 *   id: ObjectId("507f1f77bcf86cd799439011"),
 *   name: "john.doe"
 * }
 * ```
 */
@Schema({ _id: false })
export class AgentPart extends Document {
  /**
   * Référence au type de collection de l'agent.
   * Indique la collection MongoDB où se trouve l'enregistrement complet de l'agent.
   *
   * @type {string}
   * @example "agents", "users", "system"
   */
  @Prop({ type: String, required: true })
  public $ref: string

  /**
   * Identifiant unique de l'agent dans sa collection.
   *
   * @type {Types.ObjectId}
   */
  @Prop({ type: Types.ObjectId, required: true })
  public id: Types.ObjectId

  /**
   * Nom ou identifiant lisible de l'agent.
   * Permet une identification rapide sans avoir à faire une jointure.
   *
   * @type {string}
   * @optional
   */
  @Prop({ type: String })
  public name?: string
}

/**
 * Factory pour créer le schéma Mongoose à partir de la classe AgentPart.
 */
export const AgentPartSchema = SchemaFactory.createForClass(AgentPart)
