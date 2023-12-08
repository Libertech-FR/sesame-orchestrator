import { IsString, ArrayNotEmpty, ValidateNested, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigObjectType } from '../_enums/config.object';

export class ConfigObjectAttributeDTO {
  @IsString()
  name: string;

  @IsString()
  desc: string;

  @IsString()
  @IsEnum(ConfigObjectType)
  type: ConfigObjectType;

  @IsBoolean()
  required: boolean;
}

export class ConfigObjectObjectClassDTO {
  @IsString()
  name: string;

  @IsString()
  desc: string;

  @ArrayNotEmpty()
  attributes: string[];
}

export class ConfigObjectSchemaDTO {
  @ValidateNested({ each: true })
  @Type(() => ConfigObjectObjectClassDTO)
  objectClasses: ConfigObjectObjectClassDTO[];

  @ValidateNested({ each: true })
  @Type(() => ConfigObjectAttributeDTO)
  attributes: ConfigObjectAttributeDTO[];
}
