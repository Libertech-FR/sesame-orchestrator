import { ApiProperty, IntersectionType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsObject, IsEnum, IsNumber, ValidateNested } from 'class-validator';
import { inetOrgPersonDto } from './_parts/inetOrgPerson.dto';
import { IdentityState } from '../_enums/states.enum';
import { IdentityLifecycle } from '../_enums/lifecycle.enum';
import { Type } from 'class-transformer';
import { additionalFieldsPartDto } from './_parts/additionalFields.dto';
import { MetadataDto } from '~/_common/abstracts/dto/metadata.dto';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';
import { CustomFieldsDto } from '~/_common/abstracts/dto/custom-fields.dto';
import { DataStatusEnum } from '~/management/identities/_enums/data-status';

export class IdentitiesCreateDto extends IntersectionType(CustomFieldsDto, MetadataDto) {
  @IsNumber()
  @IsEnum(IdentityState)
  @ApiProperty({ enum: IdentityState })
  @IsOptional()
  public state: IdentityState;

  @IsNumber()
  @IsOptional()
  @IsEnum(InitStatesEnum)
  @ApiProperty({ enum: InitStatesEnum })
  public initState: InitStatesEnum;

  @IsNumber()
  @IsOptional()
  @IsEnum(DataStatusEnum)
  @ApiProperty({ enum: DataStatusEnum })
  public dataStatus: DataStatusEnum;

  @IsNumber()
  @IsOptional()
  @IsEnum(IdentityLifecycle)
  @ApiProperty({ enum: IdentityLifecycle })
  public lifecycle: number;

  @IsObject()
  @Type(() => inetOrgPersonDto)
  @ApiProperty({ type: inetOrgPersonDto })
  public inetOrgPerson: inetOrgPersonDto;

  @IsOptional()
  @Type(() => additionalFieldsPartDto)
  @ApiProperty({
    required: false,
    type: additionalFieldsPartDto,
    description:
      'Champs composé de deux items, un tableau de string correspondant aux attributs requis et un champs attributes contenant des pair clé/valeur correspondant aux attributs dans le champ objectClasses',
    example: {
      objectClasses: ['supann'],
      attributes: {
        supann: {
          supannAliasLogin: 'alias',
          supannEntiteAffectationPrincipale: 'entite',
        },
      },
    },
  })
  public additionalFields?: additionalFieldsPartDto;
}

export class IdentitiesDto extends IdentitiesCreateDto { }

export class IdentitiesUpdateDto extends PartialType(IdentitiesCreateDto) { }

export class IdentitiesUpsertDto extends PartialType(IdentitiesUpdateDto) {
  @IsOptional()
  @Type(() => IdentitiesUpdateDto)
  public $setOnInsert?: Partial<IdentitiesUpdateDto>;
}
