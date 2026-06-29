import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ManualTransitionRuleDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: 'État source (cycle de vie actuel)',
    example: 'I',
    required: true,
  })
  source: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ApiProperty({
    type: [String],
    description: 'États cibles autorisés pour un changement manuel depuis cet état source',
    example: ['D', 'O'],
    required: true,
  })
  targets: string[];

  @IsOptional()
  @IsObject()
  @ApiProperty({
    type: Object,
    description:
      "Filtre optionnel sur l'identité (syntaxe requête MongoDB). Si absent, la règle s'applique par défaut pour l'état source.",
    example: { 'inetOrgPerson.employeeType': 'TAIGA' },
    required: false,
  })
  filter?: object;
}

export class ManualTransitionsSchemaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualTransitionRuleDto)
  @ApiProperty({
    type: [ManualTransitionRuleDto],
    description: 'Règles de filtrage des changements de cycle de vie manuels uniquement',
    required: true,
  })
  manualTransitions: ManualTransitionRuleDto[];
}

export class ManualTransitionsUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualTransitionRuleDto)
  @ApiProperty({
    type: [ManualTransitionRuleDto],
    description: 'Règles de filtrage des changements de cycle de vie manuels uniquement',
    required: true,
  })
  manualTransitions: ManualTransitionRuleDto[];
}
