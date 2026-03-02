import { ApiProperty, PartialType } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator"
import { CustomFieldsDto } from "~/_common/abstracts/dto/custom-fields.dto"
import { AccessPartDTO } from "./parts/access.part.dto"

export class RolesCreateDto extends CustomFieldsDto {
  /**
   * Nom du rôle.
   *
   * @type {string}
   * @required
   */
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  public name: string

  /**
   * Nom affiché du rôle.
   *
   * @type {string}
   * @required
   */
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  public displayName: string

  /**
   * Description du rôle.
   *
   * @type {string}
   * @required
   */
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  public description: string

  @IsArray()
  @IsOptional()
  @Type(() => String)
  public inherits?: string[]

  @IsArray()
  @IsOptional()
  @Type(() => AccessPartDTO)
  @ValidateNested({ each: true })
  public access?: AccessPartDTO[]
}

export class RolesDto extends RolesCreateDto {
  /**
   * Identifiant unique MongoDB du rôle.
   *
   * @type {string}
   * @required
   */
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string
}

export class RolesUpdateDto extends PartialType(RolesCreateDto) { }
