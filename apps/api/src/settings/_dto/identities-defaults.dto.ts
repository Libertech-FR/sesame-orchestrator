import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class IdentitiesDefaultsLocalDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    example: ['sogxUser'],
    description: 'Schémas (objectClasses) ajoutés par défaut à la création d une identité LOCAL',
    type: [String],
  })
  public objectClasses: string[] = [];
}

/**
 * Structure du fichier `configs/identities/defaults.yml`
 */
export class IdentitiesDefaultsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => IdentitiesDefaultsLocalDto)
  @ApiProperty({ type: IdentitiesDefaultsLocalDto })
  public local: IdentitiesDefaultsLocalDto = new IdentitiesDefaultsLocalDto();
}
