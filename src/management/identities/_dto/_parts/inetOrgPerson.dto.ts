import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class inetOrgPersonCreateDto {
  @IsString()
  @ApiProperty()
  public uid: string;

  @IsString()
  @ApiProperty()
  public cn: string;

  @IsString()
  @ApiProperty()
  public employeeNumber: string;

  @IsString()
  @ApiProperty()
  public employeeType: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  public departmentNumber: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  public sn?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public displayName?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public facsimileTelephoneNumber?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public givenName?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public labeledURI?: string;

  @IsEmail()
  @ApiProperty({ required: false })
  public mail?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public mobile?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public postalAddress?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public preferredLanguage?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public telephoneNumber?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public title?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public userCertificate?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public userPassword?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public jpegPhoto?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public photo?: string;
}

export class inetOrgPersonDto extends inetOrgPersonCreateDto { }

export class inetOrgPersonUpdateDto extends PartialType(inetOrgPersonCreateDto) { }
