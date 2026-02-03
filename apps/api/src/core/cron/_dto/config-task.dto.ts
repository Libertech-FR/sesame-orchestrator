import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator'

/**
 * DTO représentant la configuration d'une tâche cron
 *
 * @class CronTaskDTO
 * @description Contient la configuration d'une tâche planifiée, conforme à la structure du YAML.
 */
export class CronTaskDTO {
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

export class ConfigTaskDTO {
  /**
   * Liste de toutes les tâches cron configurées
   *
   * @type {CronTaskDTO[]}
   * @description Tableau des tâches cron définies dans le fichier de configuration.
   * Chaque tâche est représentée par une instance de CronTaskDTO.
   *
   * @example
   * [
   *   {
   *     name: 'Task Lifecycle Cleanup',
   *     description: 'Cleans up old task lifecycle entries from the database.',
   *     enabled: true,
   *     schedule: 'CRON_PATTERN',
   *     handler: 'agents-create',
   *     options: { retentionPeriodDays: 30 }
   *   }
   * ]
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CronTaskDTO)
  @ApiProperty({
    type: [CronTaskDTO],
    description: 'Liste des tâches cron configurées',
    required: true,
  })
  public tasks: CronTaskDTO[]
}
