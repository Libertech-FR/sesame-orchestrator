import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsString, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PasswordExpirationReminderStepDto {
  @IsNumber()
  @ApiProperty({ example: 30, description: 'Nombre de jours avant expiration (0 = à expiration)', type: Number })
  public daysBefore: number = 0;

  @IsString()
  @ApiProperty({
    example: 'password_reminder_30d',
    description: 'Template pour ce jalon (fallback implicite: password_reminder)',
    type: String,
  })
  public template: string = '';

  @IsString()
  @ApiProperty({
    example: 'Votre mot de passe expirera dans 30 jours',
    description: 'Sujet pour ce jalon (fallback: passwordExpirationReminderSubject)',
    type: String,
  })
  public subject: string = '';
}

export class PasswordPoliciesDto {
  // Complexité du mot de passe
  @IsNumber()
  @ApiProperty({ example: 10, description: 'Longueur minimale du mot de passe', type: Number })
  public len: number = 10;

  @IsNumber()
  @ApiProperty({ example: 1, description: 'Nombre minimal de caractères majuscules', type: Number })
  public hasUpperCase: number = 1;

  @IsNumber()
  @ApiProperty({ example: 1, description: 'Nombre minimal de caractères minuscules', type: Number })
  public hasLowerCase: number = 1;

  @IsNumber()
  @ApiProperty({ example: 1, description: 'Nombre minimal de chiffres', type: Number })
  public hasNumbers: number = 1;

  @IsNumber()
  @ApiProperty({ example: 1, description: 'Nombre minimal de caractères spéciaux', type: Number })
  public hasSpecialChars: number = 1;

  @IsNumber()
  @ApiProperty({
    example: 30,
    description: 'Complexité minimale (entropie). En dessous, le mot de passe est refusé.',
    type: Number,
  })
  public minComplexity: number = 30;

  @IsNumber()
  @ApiProperty({
    example: 70,
    description: 'Complexité (entropie) considérée comme bonne',
    type: Number,
  })
  public goodComplexity: number = 70;

  @IsBoolean()
  @ApiProperty({ example: true, description: 'Vérifie le mot de passe via Have I Been Pwned', type: Boolean })
  public checkPwned: boolean = true;

  // Historique des mots de passe
  @IsBoolean()
  @ApiProperty({
    example: true,
    description: 'Active l’historique des mots de passe (anti-réutilisation)',
    type: Boolean,
  })
  public passwordHistoryEnabled: boolean = true;

  @IsNumber()
  @ApiProperty({
    example: 5,
    description: 'Nombre de mots de passe à conserver pour empêcher la réutilisation',
    type: Number,
  })
  public passwordHistoryCount: number = 5;

  @IsNumber()
  @ApiProperty({ example: 7776000, description: 'TTL de l’historique des mots de passe (en secondes)', type: Number })
  public passwordHistoryTtlSeconds: number = 60 * 60 * 24 * 90;

  // Rappels d'expiration mot de passe
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PasswordExpirationReminderStepDto)
  @ApiProperty({
    example: [],
    description: 'Configuration des jalons de rappel (recommandée)',
    type: [PasswordExpirationReminderStepDto],
  })
  public passwordExpirationReminderSteps: PasswordExpirationReminderStepDto[] = [];

  @IsObject()
  @ApiProperty({
    example: {
      '30': 'mail_pwd_expire_30d',
      '7': 'mail_pwd_expire_7d',
      '1': 'mail_pwd_expire_1d',
      '0': 'mail_pwd_expired',
    },
    description:
      'Mapping des templates par jalon (clé = nombre de jours avant expiration). Prioritaire sur passwordExpirationReminderTemplate',
    type: Object,
  })
  public passwordExpirationReminderTemplatesByDays: Record<string, string> = {};

  @IsString()
  @ApiProperty({
    example: 'Votre mot de passe expire bientôt',
    description: 'Sujet par défaut du mail de rappel',
    type: String,
  })
  public passwordExpirationReminderSubject: string = 'Votre mot de passe expire bientôt';

  @IsObject()
  @ApiProperty({
    example: {
      '30': 'Votre mot de passe expirera dans 1 mois',
      '7': 'Votre mot de passe expirera dans 7 jours',
      '1': 'Votre mot de passe expire demain',
      '0': 'Votre mot de passe a expiré',
    },
    description:
      'Mapping des sujets par jalon (clé = nombre de jours avant expiration). Prioritaire sur passwordExpirationReminderSubject',
    type: Object,
  })
  public passwordExpirationReminderSubjectsByDays: Record<string, string> = {};

  // Re-check HIBP
  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Active le re-check HIBP en cron à partir d’une empreinte chiffrée',
    type: Boolean,
  })
  public pwnedRecheckEnabled: boolean = false;

  @IsNumber()
  @ApiProperty({ example: 604800, description: 'Âge max (secondes) avant re-check HIBP en cron', type: Number })
  public pwnedRecheckMaxAgeSeconds: number = 60 * 60 * 24 * 7;

  @IsString()
  @ApiProperty({
    example: 'none',
    description:
      "Action à effectuer si un mot de passe est détecté comme compromis via le re-check HIBP ('none' | 'notify' | 'expire')",
    type: String,
  })
  public pwnedRecheckAction: 'none' | 'notify' | 'expire' = 'none';

  // Canaux et reset/init
  @IsBoolean()
  @ApiProperty({ example: false, description: 'Le mot de passe peut être réinitialisé par SMS', type: Boolean })
  public resetBySms: boolean = false;

  @IsString()
  @ApiProperty({
    example: 'https://monsite.com',
    description: 'URL de redirection après un changement/réinitialisation réussi',
    type: String,
  })
  public redirectUrl: string = '';

  @IsString()
  @ApiProperty({
    example: 'inetOrgPerson.mail',
    description: "Attribut identité contenant l'adresse mail de destination",
    type: String,
  })
  public emailAttribute: string = '';

  @IsString()
  @ApiProperty({
    example: 'inetOrgPerson.mobile',
    description: 'Attribut identité contenant le numéro mobile de destination',
    type: String,
  })
  public mobileAttribute: string = '';

  @IsNumber()
  @ApiProperty({ example: 900, description: 'TTL du code de reset (en secondes)', type: Number })
  public resetCodeTTL: number = 900;

  @IsNumber()
  @ApiProperty({ example: 604800, description: "TTL du jeton d'initialisation (en secondes)", type: Number })
  public initTokenTTL: number = 604800;
}
