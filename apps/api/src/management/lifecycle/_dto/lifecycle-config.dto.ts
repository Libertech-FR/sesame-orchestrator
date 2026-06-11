import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ConfigRulesObjectIdentitiesDTO } from './config-rules.dto';
import { LifecycleStateDTO } from './config-states.dto';

export class LifecycleRuleFileSummaryDto {
  @IsString()
  @ApiProperty({ type: String })
  name: string;

  @IsNumber()
  @ApiProperty({ type: Number })
  rulesCount: number;

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  cronExecutable: boolean;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String] })
  sources: string[];

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String] })
  targets: string[];
}

export class LifecycleRuleFileCreateDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, {
    message: 'Le nom de fichier doit contenir uniquement des lettres, chiffres, tirets et underscores',
  })
  @ApiProperty({
    type: String,
    description: 'Nom du fichier de règles sans extension (ex. 01-etd)',
    example: '01-etd',
    required: true,
  })
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigRulesObjectIdentitiesDTO)
  @ApiProperty({
    type: [ConfigRulesObjectIdentitiesDTO],
    description: 'Règles de transition pour les identités',
    required: true,
  })
  identities: ConfigRulesObjectIdentitiesDTO[];
}

export class LifecycleRuleFileUpdateDto extends PartialType(LifecycleRuleFileCreateDto) {}

export class LifecyclePreviewMutationDto {
  @IsObject()
  @ApiProperty({
    type: 'object',
    description: 'Mutation brute telle que définie dans la règle lifecycle',
    additionalProperties: true,
  })
  mutation: Record<string, unknown>;
}

export class LifecyclePreviewFilterDto {
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String], description: 'États source de la règle' })
  sources: string[];

  @IsOptional()
  @IsObject()
  @ApiProperty({
    type: 'object',
    description: 'Filtre MongoDB brut (rules)',
    additionalProperties: true,
  })
  rules?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Valeur brute du trigger (-1, secondes, 90d, 5s, 50m, ...)',
    required: false,
  })
  triggerInput?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Clé de date utilisée pour le filtre temporel',
    required: false,
  })
  dateKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(25)
  @ApiProperty({ type: Number, required: false, default: 5 })
  sampleLimit?: number;
}

export class LifecycleStatesUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LifecycleStateDTO)
  @ApiProperty({
    type: [LifecycleStateDTO],
    description: 'États personnalisés à enregistrer dans states.yml',
    required: true,
  })
  states: LifecycleStateDTO[];
}
