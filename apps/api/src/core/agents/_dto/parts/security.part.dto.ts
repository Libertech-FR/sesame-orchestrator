import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsArray, IsBoolean, IsOptional } from 'class-validator'

/**
 * DTO pour la partie sécurité d'un agent.
 *
 * Ce DTO définit les paramètres de sécurité d'un agent, incluant l'authentification
 * multi-facteurs, l'historique des mots de passe, les restrictions réseau et les
 * clés cryptographiques.
 *
 * @class SecurityPartDTO
 *
 * @description
 * Fonctionnalités de sécurité supportées :
 * - Historique des anciens mots de passe pour empêcher la réutilisation
 * - Authentification à deux facteurs via OTP (TOTP)
 * - Authentification U2F/FIDO avec clés de sécurité matérielles
 * - Restriction d'accès par réseau/IP (notation CIDR)
 * - Forcer le changement de mot de passe à la prochaine connexion
 * - Clé secrète unique pour les opérations cryptographiques
 *
 * Note : La clé secrète est générée automatiquement à la création de l'agent
 * par le service AgentsService et ne devrait généralement pas être fournie
 * manuellement lors de la création.
 *
 * @example
 * ```typescript
 * const security: SecurityPartDTO = {
 *   otpKey: "JBSWY3DPEHPK3PXP",
 *   allowedNetworks: ["192.168.1.0/24", "10.0.0.0/8"],
 *   changePwdAtNextLogin: true
 * };
 * ```
 */
export class SecurityPartDTO {
  /**
   * Historique des anciens mots de passe hachés.
   * Permet d'empêcher la réutilisation des mots de passe précédents.
   *
   * @type {string[]}
   * @readonly En pratique, ne devrait pas être modifiée manuellement
   * @optional
   */
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String] })
  public oldPasswords?: string[]

  /**
   * Clé secrète pour l'authentification OTP (One-Time Password).
   * Utilisée pour générer les codes TOTP pour l'authentification à deux facteurs.
   *
   * @type {string}
   * @optional
   * @example "JBSWY3DPEHPK3PXP"
   */
  @IsString()
  @IsOptional()
  @ApiProperty()
  public otpKey?: string

  /**
   * Clés U2F/FIDO enregistrées pour l'authentification matérielle.
   * Tableau des identifiants de clés de sécurité physiques.
   *
   * @type {string[]}
   * @optional
   */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({ type: [String] })
  public u2fKey?: string[]

  /**
   * Liste des réseaux/IP autorisés pour cet agent.
   * Restriction d'accès basée sur l'adresse IP ou le réseau en notation CIDR.
   * Si vide, aucune restriction réseau n'est appliquée.
   *
   * @type {string[]}
   * @optional
   * @example ["192.168.1.0/24", "10.0.0.0/8", "203.0.113.42"]
   */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({ type: [String] })
  public allowedNetworks?: string[]

  /**
   * Indique si l'agent doit changer son mot de passe à la prochaine connexion.
   * Utilisé pour forcer le renouvellement du mot de passe après une
   * réinitialisation ou suite à une politique de sécurité.
   *
   * @type {boolean}
   * @optional
   */
  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  public changePwdAtNextLogin: boolean

  /**
   * Clé secrète unique de l'agent.
   * Générée automatiquement à la création (64 caractères hexadécimaux).
   * Utilisée pour les opérations cryptographiques (signature, chiffrement, tokens).
   *
   * @type {string}
   * @optional
   * @readonly En pratique, ne devrait pas être fournie manuellement
   */
  @IsString()
  @IsOptional()
  @ApiProperty()
  public secretKey?: string
}
