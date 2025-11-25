import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

/**
 * Schéma Mongoose pour la partie sécurité des agents.
 *
 * Ce sous-schéma regroupe toutes les informations relatives à la sécurité
 * d'un agent, incluant l'authentification multi-facteurs, l'historique des
 * mots de passe, les restrictions réseau et les clés cryptographiques.
 *
 * @class SecurityPart
 * @extends {Document}
 *
 * @description
 * Fonctionnalités de sécurité supportées :
 * - Historique des anciens mots de passe pour empêcher la réutilisation
 * - Authentification à deux facteurs (OTP via TOTP)
 * - Authentification U2F/FIDO pour les clés de sécurité matérielles
 * - Restriction d'accès par réseau/IP
 * - Forcer le changement de mot de passe à la prochaine connexion
 * - Clé secrète unique pour les opérations cryptographiques
 *
 * Note : Le schéma utilise `_id: false` car il est intégré comme sous-document
 * dans le schéma Agent principal et n'a pas besoin de son propre identifiant.
 *
 * @example
 * ```typescript
 * {
 *   oldPasswords: ["$argon2id$v=19$m=...", "$argon2id$v=19$m=..."],
 *   otpKey: "JBSWY3DPEHPK3PXP",
 *   u2fKey: ["key-handle-1", "key-handle-2"],
 *   allowedNetworks: ["192.168.1.0/24", "10.0.0.0/8"],
 *   changePwdAtNextLogin: false,
 *   secretKey: "a1b2c3d4e5f6..."
 * }
 * ```
 */
@Schema({ _id: false })
export class SecurityPart extends Document {
  /**
   * Historique des anciens mots de passe hachés.
   * Permet d'empêcher la réutilisation des mots de passe précédents
   * pour renforcer la sécurité.
   *
   * @type {string[]}
   * @optional
   * @default []
   */
  @Prop({
    type: [String],
    default: [],
  })
  public oldPasswords?: string[]

  /**
   * Clé secrète pour l'authentification OTP (One-Time Password).
   * Utilisée pour générer les codes TOTP pour l'authentification à deux facteurs.
   *
   * @type {string}
   * @optional
   * @example "JBSWY3DPEHPK3PXP"
   */
  @Prop({
    type: String,
  })
  public otpKey?: string

  /**
   * Clés U2F/FIDO enregistrées pour l'authentification matérielle.
   * Tableau des identifiants de clés de sécurité physiques enregistrées.
   *
   * @type {string[]}
   * @optional
   */
  @Prop({
    type: [String],
  })
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
  @Prop({
    type: [String],
  })
  public allowedNetworks?: string[]

  /**
   * Indique si l'agent doit changer son mot de passe à la prochaine connexion.
   * Utilisé pour forcer le renouvellement du mot de passe, par exemple
   * après une réinitialisation ou une politique de sécurité.
   *
   * @type {boolean}
   * @default false
   */
  @Prop({
    type: Boolean,
    default: false,
  })
  public changePwdAtNextLogin: boolean

  /**
   * Clé secrète unique de l'agent.
   * Générée automatiquement à la création de l'agent (64 caractères hexadécimaux).
   * Utilisée pour les opérations cryptographiques (signature, chiffrement, tokens, etc.).
   *
   * @type {string}
   * @required
   * @example "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
   */
  @Prop({
    type: String,
  })
  public secretKey: string
}

/**
 * Factory pour créer le schéma Mongoose à partir de la classe SecurityPart.
 */
export const SecurityPartSchema = SchemaFactory.createForClass(SecurityPart)
