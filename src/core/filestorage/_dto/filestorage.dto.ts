import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CustomFieldsDto } from '~/_common/abstracts/dto/custom-fields.dto';
import {
  IsMongoId,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
  IsNotEmpty,
  IsMimeType,
  Matches,
} from 'class-validator';
import { FsType, FsTypeList } from '~/core/filestorage/_enum/fs-type.enum';
import { MixedValue } from '~/_common/types/mixed-value.type';

export class FileUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  public file: string;
}

export class FilestorageCreateDto extends CustomFieldsDto {
  @IsEnum(FsTypeList)
  @IsNotEmpty()
  @ApiProperty({ enum: FsTypeList, default: FsType.FILE })
  public type: FsType;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, required: true })
  public namespace: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, default: '/' })
  @Matches(/^\/(?:\.?[^\/\0]+\/?)+$/, { message: 'Path must be a valid path' })
  public path: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  public fingerprint?: string;

  @IsOptional()
  @IsMongoId()
  @ApiProperty({ type: String, required: false })
  public linkedTo?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  public comments?: string;

  @IsOptional()
  @IsMimeType()
  @ApiProperty({ type: String, required: false })
  public mime?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean, required: false })
  public hidden?: boolean;

  @IsOptional()
  @IsObject()
  @ApiProperty({ type: String, required: false, nullable: true })
  public tags?: { [key: string]: MixedValue };

  @IsOptional()
  @IsObject()
  @ApiProperty({ type: String, required: false, nullable: true })
  public acls?: { [key: string]: any } // eslint-disable-line
}

export class FilestorageDto extends FilestorageCreateDto {
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string;
}

export class FilestorageUpdateDto extends PartialType(FilestorageCreateDto) {}
