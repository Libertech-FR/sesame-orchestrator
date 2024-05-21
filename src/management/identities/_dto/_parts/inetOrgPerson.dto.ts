import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class inetOrgPersonCreateDto {
  @IsString()
  @ApiProperty()
  uid: string;

  @IsString()
  @ApiProperty()
  cn: string;

  @IsString()
  @ApiProperty()
  employeeNumber: string;

  @IsString()
  @ApiProperty()
  employeeType: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  departmentNumber: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  sn?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  displayName?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  facsimileTelephoneNumber?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  givenName?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  labeledURI?: string;

  @IsEmail()
  @ApiProperty({ required: false })
  @IsOptional()
  mail?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  mobile?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  postalAddress?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  preferredLanguage?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  telephoneNumber?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  title?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  userCertificate?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  userPassword?: string;
}

export class inetOrgPersonDto extends inetOrgPersonCreateDto { }

export class inetOrgPersonUpdateDto extends PartialType(inetOrgPersonCreateDto) { }
