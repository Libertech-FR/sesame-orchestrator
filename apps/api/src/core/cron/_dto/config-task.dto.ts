import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

@ValidatorConstraint({ name: 'isStringArrayOrObject', async: false })
class IsStringArrayOrObject implements ValidatorConstraintInterface {
  public validate(value: any, args: ValidationArguments) {
    if (!value) return true // Optional field

    // Vérifie si c'est un tableau de strings
    if (Array.isArray(value)) {
      return value.every((item) => typeof item === 'string')
    }

    // Vérifie si c'est un objet (mais pas un tableau ou null)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return true
    }

    return false
  }

  defaultMessage(args: ValidationArguments) {
    return 'options doit être soit un tableau de strings, soit un objet clé-valeur'
  }
}

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

  /**
   * Options de la tâche : soit un tableau de strings (args), soit un objet clé-valeur
   *
   * @type {string[] | Record<string, any>}
   * @description Permet de spécifier des options supplémentaires pour la tâche cron.
   * Peut être un tableau de chaînes de caractères représentant des arguments,
   * ou un objet avec des paires clé-valeur pour des configurations plus complexes.
   */
  @IsOptional()
  @Validate(IsStringArrayOrObject)
  @ApiProperty({
    oneOf: [
      { type: 'array', items: { type: 'string' } },
      { type: 'object', additionalProperties: true },
    ],
    description: 'Options spécifiques de la tâche : tableau de strings ou objet clé/valeur',
    examples: [
      ['arg1', 'arg2'],
      { key1: 'value1', key2: 'value2', retentionPeriodDays: 30 },
    ],
  })
  options?: string[] | Record<string, any>
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
