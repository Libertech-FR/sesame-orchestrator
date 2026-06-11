import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsString, Matches, ValidateNested } from 'class-validator';
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
