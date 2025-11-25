import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsNumber, IsDate, IsOptional } from 'class-validator'

/**
 * DTO pour la partie état d'un agent.
 *
 * Ce DTO définit l'état de lifecycle d'un agent, permettant de suivre son statut
 * actuel dans son cycle de vie et de gérer les suspensions temporaires.
 *
 * @class StatePartDTO
 *
 * @description
 * Le système de gestion d'état permet de :
 * - Définir l'état actuel de l'agent (DISABLED, PENDING, ACTIVE)
 * - Suivre la date du dernier changement d'état
 * - Gérer les suspensions avec date de début, fin et raison
 *
 * États possibles (voir AgentState enum) :
 * - -1 (DISABLED) : Agent désactivé
 * - 0 (PENDING) : Agent en attente d'activation
 * - 1 (ACTIVE) : Agent actif et opérationnel
 *
 * @example
 * ```typescript
 * // Agent actif
 * const state: StatePartDTO = {
 *   current: 1, // AgentState.ACTIVE
 *   lastChangedAt: new Date()
 * };
 *
 * // Agent suspendu temporairement
 * const suspendedState: StatePartDTO = {
 *   current: -1, // AgentState.DISABLED
 *   lastChangedAt: new Date(),
 *   suspendedAt: new Date(),
 *   suspendedUntil: new Date('2025-12-31'),
 *   suspendedReason: "Violation de la politique de sécurité"
 * };
 * ```
 */
export class StatePartDTO {
  /**
   * État actuel de l'agent dans son cycle de vie.
   * Valeur numérique correspondant à l'énumération AgentState.
   *
   * @type {number}
   * @required
   * @example 1 (ACTIVE), 0 (PENDING), -1 (DISABLED)
   */
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  public current: number

  /**
   * Date du dernier changement d'état.
   * Mise à jour automatiquement lors des transitions d'état.
   *
   * @type {Date}
   * @optional
   */
  @IsDate()
  @IsOptional()
  @ApiProperty()
  public lastChangedAt?: Date

  /**
   * Date de début de suspension.
   * Indique quand l'agent a été suspendu.
   *
   * @type {Date}
   * @optional
   */
  @IsDate()
  @IsOptional()
  @ApiProperty()
  public suspendedAt?: Date

  /**
   * Date de fin de suspension.
   * Indique jusqu'à quand l'agent est suspendu.
   * Si non renseignée, la suspension est indéfinie.
   *
   * @type {Date}
   * @optional
   */
  @IsDate()
  @IsOptional()
  @ApiProperty()
  public suspendedUntil?: Date

  /**
   * Raison de la suspension.
   * Texte libre expliquant pourquoi l'agent a été suspendu.
   *
   * @type {string}
   * @optional
   * @example "Violation de la politique de sécurité", "Inactivité prolongée"
   */
  @IsString()
  @IsOptional()
  @ApiProperty()
  public suspendedReason?: string
}
