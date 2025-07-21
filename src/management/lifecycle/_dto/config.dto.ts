import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNegative, IsNotEmpty, IsNumber, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { IdentityLifecycle } from '~/management/identities/_enums/lifecycle.enum';

export class ConfigObjectIdentitiesDTO {
  @IsEnum(IdentityLifecycle, { each: true })
  @ApiProperty({
    type: String,
    enum: IdentityLifecycle,
    description: 'Lifecycle state of the identity',
    example: IdentityLifecycle.ACTIVE,
    required: true,
  })
  public sources: IdentityLifecycle[];

  @IsOptional()
  @IsObject()
  public rules: object;

  @IsOptional()
  @IsNumber()
  @IsNegative()
  @Type(() => Number)
  @ApiProperty({ type: Number, required: false })
  public trigger: number;

  @IsNotEmpty()
  @IsEnum(IdentityLifecycle)
  @ApiProperty({
    type: String,
    enum: IdentityLifecycle,
    description: 'Target lifecycle state for the identity',
    example: IdentityLifecycle.DELETED,
    required: true,
  })
  public target: IdentityLifecycle;
}

export class ConfigObjectSchemaDTO {
  @IsOptional()
  @IsArray()
  @ApiProperty({
    type: ConfigObjectIdentitiesDTO,
    required: false,
  })
  @ValidateNested({ each: true })
  @Type(() => ConfigObjectIdentitiesDTO)
  public identities: ConfigObjectIdentitiesDTO[]
}
