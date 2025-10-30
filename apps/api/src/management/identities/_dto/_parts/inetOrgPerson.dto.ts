import { ApiProperty, PartialType } from '@nestjs/swagger';
import { plainToInstance, Type } from 'class-transformer';
import { IsString, IsEmail, IsOptional, IsArray, ValidateIf } from 'class-validator';

export class inetOrgPersonCreateDto {
  public static initForFingerprint(partial: Partial<inetOrgPersonCreateDto>) {
    try {
      return plainToInstance(inetOrgPersonCreateDto, {
        cn: partial.cn || null,
        sn: partial.sn || null,
        uid: partial.uid || null,
        employeeNumber: partial.employeeNumber || [],
        employeeType: partial.employeeType || null,
        departmentNumber: partial.departmentNumber || [],
        displayName: partial.displayName || null,
        facsimileTelephoneNumber: partial.facsimileTelephoneNumber || null,
        givenName: partial.givenName || null,
        labeledURI: partial.labeledURI || null,
        mail: partial.mail || null,
        mobile: partial.mobile || null,
        postalAddress: partial.postalAddress || null,
        preferredLanguage: partial.preferredLanguage || null,
        telephoneNumber: partial.telephoneNumber || null,
        title: partial.title || null,
        userCertificate: partial.userCertificate || null,
        jpegPhoto: partial.jpegPhoto || null,

        ...partial
      });
    } catch (error) {
      console.error('inetOrgPersonCreateDto.initForFingerprint', error);
      throw error;
    }
  }

  @IsString()
  @ApiProperty()
  @IsOptional()
  public uid: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  public cn: string;

  @IsArray()
  @Type(() => String)
  @IsString({ each: true })
  @ApiProperty()
  @IsOptional()
  public employeeNumber: string[];

  @IsString()
  @ApiProperty()
  @IsOptional()
  public employeeType: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public departmentNumber: string[];

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

  @ValidateIf(o => {
    return o.mail && o.mail.length > 0;
  })
  @IsEmail()
  @ApiProperty({ required: false })
  @IsOptional()
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

  // @IsString()
  // @ApiProperty({ required: false })
  // @IsOptional()
  // public userPassword?: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public jpegPhoto?: string;

  // @IsString()
  // @ApiProperty({ required: false })
  // @IsOptional()
  // public photo?: string;
}

export class inetOrgPersonDto extends inetOrgPersonCreateDto { }

export class inetOrgPersonUpdateDto extends PartialType(inetOrgPersonCreateDto) { }
