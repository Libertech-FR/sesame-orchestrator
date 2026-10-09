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
  ValidateBy,
  ValidationOptions,
} from 'class-validator';
import { CustomFieldsDto } from '~/_common/abstracts/dto/custom-fields.dto';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { FilterGroups } from '~/_common/functions/filter-schema-groups.function';
import { GroupType } from '../_schemas/groups.schema';

const isFilterGroup = (value: unknown): boolean => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Filtre de groupe dynamique : un groupe de conditions (ET) ou une liste de groupes (OU)
 */
function IsFilterGroups(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isFilterGroups',
      validator: {
        validate: (value: unknown) => isFilterGroup(value) || (Array.isArray(value) && value.every(isFilterGroup)),
        defaultMessage: () => '$property doit être un objet de filtres ou une liste d’objets de filtres',
      },
    },
    validationOptions,
  );
}

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

  @IsMongoId()
  @IsOptional()
  @ApiProperty({ type: String, required: false, nullable: true, description: 'Identifiant de la famille du groupe' })
  public family?: string | null;

  @IsEnum(GroupType)
  @IsOptional()
  @ApiProperty({
    enum: GroupType,
    required: false,
    default: GroupType.STATIC,
    description: 'Groupe normal ou dynamique',
  })
  public type?: GroupType;

  @IsFilterGroups()
  @IsOptional()
  @ApiProperty({
    type: Object,
    required: false,
    nullable: true,
    description:
      'Filtre de sélection des membres d’un groupe dynamique (clés signées, ex: { "@state": ["1"] }), ' +
      'ou liste de filtres combinés par OU (ex: [{ "@state": ["1"] }, { ":sn": "x" }])',
  })
  public filters?: FilterGroups | null;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  @ApiProperty({
    type: [String],
    required: false,
    description: 'Identifiants des identités membres (ignoré pour un groupe dynamique)',
  })
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

export class GroupsFiltersPreviewDto {
  @IsFilterGroups()
  @ApiProperty({ type: Object, description: 'Filtre de groupe dynamique à évaluer (objet ou liste de groupes OU)' })
  public filters: FilterGroups;
}

export class GroupsMemberOfDto {
  @IsArray()
  @IsMongoId({ each: true })
  @ApiProperty({ type: [String], description: 'Liste complète des groupes de l’identité' })
  public groups: string[];
}

export class GroupsIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ type: [String] })
  public ids: string[];
}

export class GroupsSyncDto extends GroupsIdsDto {}
