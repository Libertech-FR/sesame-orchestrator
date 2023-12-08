import { PartialType } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class inetOrgPersonCreateDto {
  @IsString()
  cn: string;

  @IsString()
  displayName: string;

  @IsString()
  facsimileTelephoneNumber: string;

  @IsString()
  givenName: string;

  @IsString()
  labeledURI: string;

  @IsEmail()
  mail: string;

  @IsOptional()
  @IsString()
  mobile: string;

  @IsString()
  postalAddress: string;

  @IsString()
  preferredLanguage: string;

  @IsString()
  sn: string;

  @IsString()
  telephoneNumber: string;

  @IsString()
  title: string;

  @IsString()
  uid: string;

  @IsString()
  userCertificate: string;

  @IsString()
  userPassword: string;
}

export class inetOrgPersonDto extends inetOrgPersonCreateDto {}

export class inetOrgPersonUpdateDto extends PartialType(inetOrgPersonCreateDto) {}
