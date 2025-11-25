import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { AgentState, AgentStateList } from '~/core/agents/_enum/agent-state.enum'

/**
 * Schéma Mongoose pour la partie état des agents.
 *
 * Ce sous-schéma gère l'état de lifecycle d'un agent, permettant de suivre
 * son statut actuel (actif, inactif, suspendu, etc.) et de conserver les
 * informations relatives aux suspensions temporaires.
 *
 * @class StatePart
 * @extends {Document}
 *
 * @description
 * Le système de gestion d'état permet de :
 * - Suivre l'état actuel de l'agent dans son cycle de vie
 * - Enregistrer la date du dernier changement d'état
 * - Gérer les suspensions temporaires avec date de début, fin et raison
 * - Implémenter des workflows de validation et d'activation
 *
 * États typiques d'un agent (voir AgentState) :
 * - PENDING : En attente d'activation
 * - ACTIVE : Actif et opérationnel
 * - INACTIVE : Désactivé temporairement
 * - SUSPENDED : Suspendu (avec date de fin possible)
 * - DELETED : Marqué pour suppression
 *
 * Note : Le schéma utilise `_id: false` car il est intégré comme sous-document
 * dans le schéma Agent principal et n'a pas besoin de son propre identifiant.
 *
 * @example
 * ```typescript
 * {
 *   current: AgentState.ACTIVE,
 *   lastChangedAt: ISODate("2025-11-25T10:00:00Z"),
 *   suspendedAt: null,
 *   suspendedUntil: null,
 *   suspendedReason: null
 * }
 *
 * // Exemple d'agent suspendu
 * {
 *   current: AgentState.SUSPENDED,
 *   lastChangedAt: ISODate("2025-11-25T10:00:00Z"),
 *   suspendedAt: ISODate("2025-11-25T10:00:00Z"),
 *   suspendedUntil: ISODate("2025-12-25T10:00:00Z"),
 *   suspendedReason: "Violation de la politique de sécurité"
 * }
 * ```
 */
@Schema({ _id: false })
export class StatePart extends Document {
  /**
   * État actuel de l'agent dans son cycle de vie.
   * Représente le statut opérationnel de l'agent.
   *
   * @type {number}
   * @required
   * @default AgentState.PENDING
   * @see {AgentState}
   * @see {AgentStateList}
   */
  @Prop({
    required: true,
    type: Number,
    enum: AgentStateList,
    default: AgentState.PENDING,
  })
  public current: number

  /**
   * Date du dernier changement d'état.
   * Permet de tracer quand l'agent a changé d'état pour la dernière fois.
   *
   * @type {Date}
   * @optional
   * @default Date actuelle
   */
  @Prop({
    type: Date,
    default: new Date(),
  })
  public lastChangedAt?: Date

  /**
   * Date de début de suspension.
   * Indique quand l'agent a été suspendu.
   * Uniquement renseigné si l'état actuel est SUSPENDED.
   *
   * @type {Date}
   * @optional
   */
  @Prop({ type: Date })
  public suspendedAt?: Date

  /**
   * Date de fin de suspension.
   * Indique jusqu'à quand l'agent est suspendu.
   * Si non renseignée, la suspension est indéfinie.
   *
   * @type {Date}
   * @optional
   * @example ISODate("2025-12-31T23:59:59Z")
   */
  @Prop({ type: Date })
  public suspendedUntil?: Date

  /**
   * Raison de la suspension.
   * Texte libre expliquant pourquoi l'agent a été suspendu.
   *
   * @type {string}
   * @optional
   * @example "Violation de la politique de sécurité", "Inactivité prolongée"
   */
  @Prop({ type: String })
  public suspendedReason?: string
}

/**
 * Factory pour créer le schéma Mongoose à partir de la classe StatePart.
 */
export const StatePartSchema = SchemaFactory.createForClass(StatePart)
