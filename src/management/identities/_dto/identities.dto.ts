import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsObject, IsEnum, IsNumber } from 'class-validator';
import { inetOrgPersonDto } from './_parts/inetOrgPerson.dto';
import { IdentityState } from '../_enums/states.enum';

export class IdentitiesCreateDto {
  @IsNumber()
  @IsEnum(IdentityState)
  state: IdentityState;

  @IsObject()
  inetOrgPerson: inetOrgPersonDto;

  @IsOptional()
  additionalFields: { [key: string]: any };
}

export class IdentitiesDto extends IdentitiesCreateDto {}

export class IdentitiesUpdateDto extends PartialType(IdentitiesCreateDto) {}
