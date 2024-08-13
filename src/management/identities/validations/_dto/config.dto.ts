import { IsString, ArrayNotEmpty, ValidateNested, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigObjectType } from '../_enums/config.object';

export class ConfigObjectAttributeDTO {
  @IsString()
  public name: string;

  @IsString()
  public desc: string;

  @IsString()
  @IsEnum(ConfigObjectType)
  public type: ConfigObjectType;

  @IsBoolean()
  public required: boolean;
}

export class ConfigObjectObjectClassDTO {
  @IsString()
  public name: string;

  @IsString()
  public desc: string;

  @ArrayNotEmpty()
  public attributes: string[];
}

export class ConfigObjectSchemaDTO {
  @ValidateNested({ each: true })
  @Type(() => ConfigObjectObjectClassDTO)
  public objectClasses: ConfigObjectObjectClassDTO[];

  @ValidateNested({ each: true })
  @Type(() => ConfigObjectAttributeDTO)
  public attributes: ConfigObjectAttributeDTO[];
}
