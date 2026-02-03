
import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

/**
 * DTO pour la création d'une tâche cron
 *
 * @class CronCreateDto
 * @description Définit les données requises pour créer une nouvelle tâche cron
 * conforme à la structure attendue dans le fichier YAML de configuration.
 */
export class CronCreateDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: 'Nom de la tâche',
    example: 'Task Lifecycle Cleanup',
    required: true,
  })
  name: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: 'Description de la tâche',
    example: 'Cleans up old task lifecycle entries from the database.',
    required: true,
  })
  description: string

  @IsBoolean()
  @ApiProperty({
    type: Boolean,
    description: 'Activation de la tâche',
    example: true,
    required: true,
  })
  enabled: boolean

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: 'Expression cron de planification',
    example: '*/5 * * * *',
    required: true,
  })
  schedule: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: 'Unique identifiant du gestionnaire de la tâche',
    example: 'agents-create',
    required: true,
  })
  handler: string

  @IsObject()
  @IsOptional()
  @ApiProperty({
    type: 'object',
    description: 'Options spécifiques de la tâche (clé/valeur)',
    example: { retentionPeriodDays: 30 },
    additionalProperties: true,
  })
  options?: Record<string, any>
}

export class CronDto extends CronCreateDto {
  /**
   * Identifiant MongoDB de la tâche cron
   *
   * @type {string}
   * @required
   */
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string
}

/**
 * DTO de mise à jour partielle d'une tâche cron
 *
 * @class CronUpdateDto
 * @extends PartialType(CronCreateDto)
 * @description Permet la mise à jour partielle des propriétés d'une tâche cron.
 * Toutes les propriétés de CronCreateDto deviennent optionnelles.
 */
export class CronUpdateDto extends PartialType(CronCreateDto) { }
