import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsObject, IsEnum, IsNumber } from 'class-validator';
import { inetOrgPersonDto } from './_parts/inetOrgPerson.dto';
import { IdentityState } from '../_enums/states.enum';
import { IdentityLifecycle } from '../_enums/lifecycle.enum';
import { Type } from 'class-transformer';
import { additionalFieldsPartDto } from './_parts/additionalFields.dto';
import { MetadataDto } from '~/_common/abstracts/dto/metadata.dto';

export class IdentitiesCreateDto extends MetadataDto {
  @IsNumber()
  @IsEnum(IdentityState)
  @ApiProperty({ enum: IdentityState })
  state: IdentityState;

  @IsNumber()
  @IsOptional()
  @IsEnum(IdentityLifecycle)
  @ApiProperty({ enum: IdentityLifecycle })
  lifecycle: number;

  @IsObject()
  @Type(() => inetOrgPersonDto)
  @ApiProperty({ type: inetOrgPersonDto })
  inetOrgPerson: inetOrgPersonDto;

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
  additionalFields?: additionalFieldsPartDto;
}

export class IdentitiesDto extends IdentitiesCreateDto {}

export class IdentitiesUpdateDto extends PartialType(IdentitiesCreateDto) {}
