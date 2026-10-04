import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CustomFieldsDto } from '~/_common/abstracts/dto/custom-fields.dto';
import { IdentityState } from '~/management/identities/_enums/states.enum';

export class GroupsCreateDto extends CustomFieldsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Nom commun du groupe (RDN LDAP)' })
  public cn: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  public description?: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty({ type: String, required: false, nullable: true, description: 'Adresse email du groupe' })
  public mail?: string | null;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  @ApiProperty({ type: [String], required: false, description: 'Identifiants des identités membres' })
  public member?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  @ApiProperty({ type: [String], required: false, description: 'Identifiants des identités propriétaires' })
  public owner?: string[];
}

export class GroupsUpdateDto extends PartialType(GroupsCreateDto) {}

export class GroupsDto extends GroupsCreateDto {
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string;

  @IsEnum(IdentityState)
  @ApiProperty({ enum: IdentityState })
  public state: IdentityState;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ type: Date, required: false })
  public lastBackendSync?: Date;
}

export class GroupsMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ type: [String] })
  public members: string[];
}

export class GroupsMemberOfDto {
  @IsArray()
  @IsMongoId({ each: true })
  @ApiProperty({ type: [String], description: 'Liste complète des groupes de l’identité' })
  public groups: string[];
}

export class GroupsSyncDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ type: [String] })
  public ids: string[];
}
