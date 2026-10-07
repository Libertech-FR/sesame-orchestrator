import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GroupFamiliesCreateDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Nom de la famille' })
  public name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: String, required: false, nullable: true })
  public description?: string | null;

  @IsString()
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    nullable: true,
    description: "Couleur d'affichage (nom Quasar ou code hexadécimal)",
  })
  public color?: string | null;
}

export class GroupFamiliesUpdateDto extends PartialType(GroupFamiliesCreateDto) {}

export class GroupFamiliesDto extends GroupFamiliesCreateDto {
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string;
}
