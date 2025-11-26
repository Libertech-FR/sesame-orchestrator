import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * DTO représentant un état individuel du cycle de vie
 *
 * @class LifecycleStateDTO
 * @description Définit un état unique du cycle de vie d'une identité avec ses métadonnées associées.
 * Chaque état possède une clé unique d'un caractère, un label lisible, une description détaillée,
 * et optionnellement une icône et une couleur pour la représentation visuelle.
 *
 * @example
 * {
 *   key: 'A',
 *   label: 'En Attente',
 *   description: 'supannRessourceEtat : {COMPTE} A SupannAnticipe',
 *   icon: 'mdi-account-clock',
 *   color: '#f0ad4e'
 * }
 */
export class LifecycleStateDTO {
  /**
   * Clé unique identifiant l'état
   *
   * @type {string}
   * @description Identifiant court d'un seul caractère pour l'état.
   * Utilisé comme référence dans la base de données et les transitions.
   *
   * @example 'A' (Attente), 'O' (Officiel), 'M' (Manuel), 'X' (Archivé)
   */
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Clé unique de l\'état (un seul caractère)',
    example: 'A',
    maxLength: 1,
    required: true,
  })
  public key: string

  /**
   * Label lisible de l'état
   *
   * @type {string}
   * @description Nom complet et lisible de l'état affiché dans l'interface utilisateur.
   * Décrit de manière claire la phase du cycle de vie.
   *
   * @example 'En Attente', 'Officiel', 'Manuel', 'Archivé'
   */
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Label/nom de l\'état',
    example: 'En Attente',
    required: true,
  })
  public label: string

  /**
   * Description détaillée de l'état avec correspondances supann
   *
   * @type {string}
   * @description Description complète de l'état incluant les correspondances avec
   * les attributs supann (Supplément au référentiel LDAP de l'enseignement supérieur).
   * Documente la signification et l'utilisation de l'état dans le contexte métier.
   *
   * @example 'supannRessourceEtat : {COMPTE} A SupannAnticipe'
   */
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Description détaillée de l\'état avec correspondances supann',
    example: 'supannRessourceEtat : {COMPTE} A SupannAnticipe',
    required: true,
  })
  public description: string

  /**
   * Icône Material Design associée à l'état
   *
   * @type {string}
   * @optional
   * @description Identifiant de l'icône Material Design Icons (mdi) à utiliser
   * pour représenter visuellement cet état dans l'interface utilisateur.
   *
   * @example 'mdi-account-clock', 'mdi-account-check', 'mdi-archive'
   */
  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Icône associée à l\'état (optionnel)',
    example: 'mdi-account-clock',
    required: false,
  })
  public icon?: string

  /**
   * Couleur hexadécimale associée à l'état
   *
   * @type {string}
   * @optional
   * @description Code couleur hexadécimal utilisé pour distinguer visuellement
   * l'état dans l'interface utilisateur (badges, tags, indicateurs).
   *
   * @example '#f0ad4e' (orange), '#5cb85c' (vert), '#d9534f' (rouge)
   */
  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Couleur associée à l\'état (optionnel, en hexadécimal)',
    example: '#f0ad4e',
    required: false,
  })
  public color?: string
}

/**
 * DTO de configuration globale des états de cycle de vie
 *
 * @class ConfigStatesDTO
 * @description Conteneur principal pour l'ensemble des états de cycle de vie disponibles.
 * Correspond à la structure du fichier de configuration `configs/lifecycle/states.yml`
 * et définit tous les états possibles qu'une identité peut avoir dans le système.
 *
 * @example
 * {
 *   states: [
 *     {
 *       key: 'A',
 *       label: 'En Attente',
 *       description: 'Compte anticipé en attente d\'activation',
 *       icon: 'mdi-account-clock',
 *       color: '#f0ad4e'
 *     },
 *     {
 *       key: 'O',
 *       label: 'Officiel',
 *       description: 'Compte actif et validé',
 *       icon: 'mdi-account-check',
 *       color: '#5cb85c'
 *     }
 *   ]
 * }
 */
export class ConfigStatesDTO {
  /**
   * Liste de tous les états de cycle de vie disponibles
   *
   * @type {LifecycleStateDTO[]}
   * @description Tableau contenant l'ensemble des états de cycle de vie configurés
   * dans le système. Chaque état définit une phase possible du cycle de vie d'une identité.
   * Les états sont utilisés pour gérer les transitions automatiques et manuelles
   * entre différentes phases de l'existence d'un compte.
   *
   * @example
   * [
   *   { key: 'A', label: 'En Attente', description: '...' },
   *   { key: 'O', label: 'Officiel', description: '...' },
   *   { key: 'M', label: 'Manuel', description: '...' }
   * ]
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LifecycleStateDTO)
  @ApiProperty({
    type: [LifecycleStateDTO],
    description: 'Liste des états de cycle de vie disponibles',
    required: true,
  })
  public states: LifecycleStateDTO[]
}
