import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FormFieldDto } from './field.dto';
import { FormTypes } from '../../_enum/types';

export class FormSectionDto {
  @IsString()
  @ApiProperty()
  label: string;

  @IsEnum(FormTypes)
  @ApiProperty()
  type: FormTypes;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  icon?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  description?: string;

  @IsObject()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => FormSectionDto)
  @ApiProperty({ type: () => FormSectionDto, required: false })
  sections?: { [sectionName: string]: FormSectionDto };

  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  @ApiProperty({ type: FormFieldDto })
  fields: { [fieldName: string]: FormFieldDto };
}
