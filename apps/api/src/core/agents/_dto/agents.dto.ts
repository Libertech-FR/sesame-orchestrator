import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsString, IsNotEmpty, ValidateNested, IsEmail, IsBoolean, IsMongoId, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'
import { StatePartDTO } from './parts/state.part.dto'
import { SecurityPartDTO } from './parts/security.part.dto'
import { CustomFieldsDto } from '~/_common/abstracts/dto/custom-fields.dto'

/**
 * DTO pour la création d'un agent.
 *
 * Ce DTO définit les données requises et optionnelles pour créer un nouvel agent
 * dans le système. Il inclut les validations nécessaires pour garantir l'intégrité
 * des données et hérite des fonctionnalités de champs personnalisés.
 *
 * @class AgentsCreateDto
 * @extends {CustomFieldsDto}
 *
 * @description
 * Données requises :
 * - username : Nom d'utilisateur unique
 * - email : Adresse email unique et valide
 * - password : Mot de passe (sera haché automatiquement avec Argon2)
 * - state : État de lifecycle de l'agent
 *
 * Données optionnelles :
 * - displayName : Nom d'affichage convivial
 * - thirdPartyAuth : Méthode d'authentification tierce
 * - baseURL : URL de base pour l'agent
 * - security : Configuration de sécurité (clés, restrictions, etc.)
 * - hidden : Indicateur de visibilité de l'agent
 * - customFields : Champs personnalisés additionnels (hérité)
 *
 * Note : Le mot de passe sera automatiquement haché et une clé secrète
 * sera générée lors de la création par le service AgentsService.
 *
 * @example
 * ```typescript
 * const createDto: AgentsCreateDto = {
 *   username: "john.doe",
 *   email: "john.doe@example.com",
 *   password: "SecurePassword123!",
 *   displayName: "John Doe",
 *   state: { current: AgentState.PENDING },
 *   baseURL: "/",
 *   hidden: false
 * };
 * ```
 */
export class AgentsCreateDto extends CustomFieldsDto {
  /**
   * Nom d'utilisateur unique de l'agent.
   *
   * @type {string}
   * @required
   */
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  public username: string

  /**
   * Nom d'affichage de l'agent.
   *
   * @type {string}
   * @optional
   */
  @IsString()
  @IsOptional()
  @ApiProperty()
  public displayName?: string

  /**
   * Adresse email unique de l'agent.
   * Doit être une adresse email valide.
   *
   * @type {string}
   * @required
   */
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  public email: string

  /**
   * Mot de passe de l'agent.
   * Sera automatiquement haché avec Argon2 avant stockage.
   *
   * @type {string}
   * @required
   */
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  public password: string

  /**
   * Méthode d'authentification tierce.
   *
   * @type {string}
   * @optional
   * @default "local"
   * @example "local", "oauth2", "saml"
   */
  @IsString()
  @IsOptional()
  @ApiProperty()
  public thirdPartyAuth?: string

  /**
   * État de lifecycle de l'agent.
   *
   * @type {StatePartDTO}
   * @required
   */
  @ValidateNested()
  @Type(() => StatePartDTO)
  @IsNotEmpty()
  @ApiProperty({ type: StatePartDTO })
  public state: StatePartDTO

  /**
   * URL de base pour l'agent.
   *
   * @type {string}
   * @optional
   * @default "/"
   */
  @IsString()
  @IsOptional()
  @ApiProperty()
  public baseURL?: string

  /**
   * Configuration de sécurité de l'agent.
   * Contient les clés, restrictions et paramètres de sécurité.
   *
   * @type {SecurityPartDTO}
   */
  @ValidateNested()
  @Type(() => SecurityPartDTO)
  @ApiProperty({ type: SecurityPartDTO })
  public security: SecurityPartDTO

  /**
   * Indicateur de visibilité de l'agent.
   * Si true, l'agent est masqué dans les listes publiques.
   *
   * @type {boolean}
   * @optional
   */
  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  public hidden: boolean
}

/**
 * DTO représentant un agent complet avec son identifiant.
 *
 * Utilisé pour les réponses API qui retournent un agent existant.
 * Inclut toutes les propriétés de création plus l'identifiant MongoDB.
 *
 * @class AgentsDto
 * @extends {AgentsCreateDto}
 *
 * @example
 * ```typescript
 * const agent: AgentsDto = {
 *   _id: "507f1f77bcf86cd799439011",
 *   username: "john.doe",
 *   email: "john.doe@example.com",
 *   // ... autres propriétés
 * };
 * ```
 */
export class AgentsDto extends AgentsCreateDto {
  /**
   * Identifiant unique MongoDB de l'agent.
   *
   * @type {string}
   * @required
   */
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string
}

/**
 * DTO pour la mise à jour d'un agent.
 *
 * Toutes les propriétés d'AgentsCreateDto sont optionnelles pour permettre
 * des mises à jour partielles. Utilise PartialType de NestJS pour générer
 * automatiquement la version partielle du DTO de création.
 *
 * @class AgentsUpdateDto
 * @extends {PartialType(AgentsCreateDto)}
 *
 * @description
 * Note : Si le mot de passe est fourni dans les données de mise à jour,
 * il sera automatiquement re-haché par le service AgentsService.
 *
 * @example
 * ```typescript
 * // Mise à jour du nom d'affichage uniquement
 * const updateDto: AgentsUpdateDto = {
 *   displayName: "John F. Doe"
 * };
 *
 * // Mise à jour de plusieurs champs
 * const updateDto: AgentsUpdateDto = {
 *   displayName: "John F. Doe",
 *   state: { current: AgentState.ACTIVE }
 * };
 * ```
 */
export class AgentsUpdateDto extends PartialType(AgentsCreateDto) { }
