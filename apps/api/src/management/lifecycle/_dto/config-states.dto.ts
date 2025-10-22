import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO pour un état de cycle de vie individuel
 * Basé sur la structure du fichier states.yml
 */
export class LifecycleStateDTO {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Clé unique de l\'état (une seule lettre)',
    example: 'A',
    maxLength: 1,
    required: true,
  })
  public key: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Label/nom de l\'état',
    example: 'En Attente',
    required: true,
  })
  public label: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Description détaillée de l\'état avec correspondances supann',
    example: 'supannRessourceEtat : {COMPTE} A SupannAnticipe',
    required: true,
  })
  public description: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Icône associée à l\'état (optionnel)',
    example: 'mdi-account-clock',
    required: false,
  })
  public icon?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Couleur associée à l\'état (optionnel, en hexadécimal)',
    example: '#f0ad4e',
    required: false,
  })
  public color?: string;
}

/**
 * DTO pour la configuration des états de cycle de vie
 * Correspond à la structure du fichier configs/lifecycle/states.yml
 */
export class ConfigStatesDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LifecycleStateDTO)
  @ApiProperty({
    type: [LifecycleStateDTO],
    description: 'Liste des états de cycle de vie disponibles',
    required: true,
  })
  public states: LifecycleStateDTO[];
}
