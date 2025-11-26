import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsDateString, IsMongoId, IsNotEmpty } from 'class-validator'
import { Types } from 'mongoose'
import { IdentityLifecycleDefault } from '~/management/identities/_enums/lifecycle.enum'

/**
 * DTO pour la création d'un événement de cycle de vie
 *
 * @class LifecycleCreateDto
 * @description Définit les données requises pour enregistrer un nouvel événement
 * dans l'historique du cycle de vie d'une identité. Chaque événement associe
 * une identité à un état de cycle de vie à une date donnée.
 *
 * @example
 * {
 *   refId: '507f1f77bcf86cd799439011',
 *   lifecycle: 'OFFICIAL',
 *   date: '2025-11-26T10:00:00Z'
 * }
 */
export class LifecycleCreateDto {
  /**
   * Référence MongoDB vers l'identité concernée
   *
   * @type {Types.ObjectId}
   * @description Identifiant ObjectId de l'identité à laquelle cet événement
   * de cycle de vie est associé. Permet de tracer l'historique complet
   * des changements d'état pour une identité donnée.
   *
   * @example '507f1f77bcf86cd799439011'
   */
  @ApiProperty({
    description: 'Référence vers l\'identité',
    type: String,
  })
  @IsNotEmpty()
  public refId: Types.ObjectId

  /**
   * État du cycle de vie
   *
   * @type {IdentityLifecycleDefault | string}
   * @description État de cycle de vie dans lequel l'identité se trouve ou est transférée.
   * Peut être une valeur de l'énumération IdentityLifecycleDefault ou une chaîne
   * personnalisée pour les états configurés dynamiquement.
   *
   * @example 'OFFICIAL', 'MANUAL', 'ARCHIVED'
   */
  @ApiProperty({
    description: 'État du cycle de vie',
    enum: IdentityLifecycleDefault,
  })
  @IsNotEmpty()
  public lifecycle: IdentityLifecycleDefault | string

  /**
   * Date de l'événement de cycle de vie
   *
   * @type {Date}
   * @description Horodatage de l'événement de cycle de vie. Représente le moment
   * où le changement d'état a eu lieu ou doit avoir lieu. Utilisé pour l'historique
   * et le calcul des transitions automatiques basées sur le temps.
   *
   * @example '2025-11-26T10:00:00Z'
   */
  @ApiProperty({
    description: 'Date de l\'événement de cycle de vie',
    type: Date,
  })
  @IsDateString()
  public date: Date
}

/**
 * DTO complet d'un événement de cycle de vie
 *
 * @class LifecycleDto
 * @extends LifecycleCreateDto
 * @description Représente un événement de cycle de vie existant dans la base de données.
 * Hérite de toutes les propriétés de création et ajoute l'identifiant MongoDB.
 *
 * @example
 * {
 *   _id: '65a1b2c3d4e5f6g7h8i9j0k1',
 *   refId: '507f1f77bcf86cd799439011',
 *   lifecycle: 'OFFICIAL',
 *   date: '2025-11-26T10:00:00Z'
 * }
 */
export class LifecycleDto extends LifecycleCreateDto {
  /**
   * Identifiant MongoDB de l'événement de cycle de vie
   *
   * @type {string}
   * @description Identifiant unique de l'événement de cycle de vie dans la base de données.
   * Généré automatiquement par MongoDB lors de la création de l'événement.
   *
   * @example '65a1b2c3d4e5f6g7h8i9j0k1'
   */
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string
}

/**
 * DTO pour la mise à jour d'un événement de cycle de vie
 *
 * @class LifecycleUpdateDto
 * @extends PartialType(LifecycleCreateDto)
 * @description Version partielle de LifecycleCreateDto où tous les champs sont optionnels.
 * Permet la mise à jour sélective des propriétés d'un événement de cycle de vie existant.
 *
 * @example
 * {
 *   lifecycle: 'MANUAL',
 *   date: '2025-11-27T10:00:00Z'
 * }
 */
export class LifecycleUpdateDto extends PartialType(LifecycleCreateDto) { }
