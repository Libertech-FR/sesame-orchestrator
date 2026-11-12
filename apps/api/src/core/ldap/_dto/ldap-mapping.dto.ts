import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class LdapMappingMatchDto {
  @IsString()
  @IsNotEmpty()
  public attribute: string;

  @IsString()
  @IsNotEmpty()
  public value: string;
}

export class LdapMappingDnDto {
  @IsString()
  @IsNotEmpty()
  public rdnAttribute: string;

  @IsString()
  @IsNotEmpty()
  public rdnValue: string;

  @IsString()
  @IsNotEmpty()
  public baseDN: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LdapMappingMatchDto)
  public match?: LdapMappingMatchDto | null;
}

export class LdapMappingImportDto {
  /**
   * Schémas de champs additionnels (configs/identities/validations/<nom>.yml) importés depuis l'objectClass LDAP
   * du même nom (comparaison insensible à la casse)
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public additionalFields?: string[];
}

/**
 * Structure du fichier `configs/ldap/mapping.yml`
 */
export class LdapMappingDto {
  @ValidateNested()
  @Type(() => LdapMappingDnDto)
  public dn: LdapMappingDnDto;

  @IsArray()
  @IsString({ each: true })
  public objectClasses: string[];

  @IsObject()
  public attributes: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  public additionalFields?: boolean;

  /** Options de l'import initial (base Sesame vide) */
  @IsOptional()
  @ValidateNested()
  @Type(() => LdapMappingImportDto)
  public import?: LdapMappingImportDto;
}
