import { IsEmail, IsOptional, IsString, IsUrl, Matches, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MAIL_RECIPIENT_JSON_PATH_REGEX } from '~/settings/_utils/mail-recipient-json-path.util';

export class MailSettingsDto {
  @IsUrl({ protocols: ['smtp', 'smtps'], require_protocol: true, require_tld: false })
  @ApiProperty({ example: 'smtp://smscsim.smpp.org:25', description: 'Serveur SMTP', type: String })
  public host: string = 'smtp://localhost:25';

  @IsEmail()
  @ApiProperty({ example: 'no-reply@mondomaine', description: 'Emetteur', type: String })
  public sender: string;

  @IsString()
  @ApiProperty({ example: 'monlogin@mondomaine', description: 'username', type: String })
  public username: string;

  @IsString()
  @ApiProperty({ example: 'myPassword', description: 'password', type: String })
  public password: string;

  @ValidateIf((_, v) => v !== undefined && v !== null && String(v).trim() !== '')
  @IsString()
  @Matches(MAIL_RECIPIENT_JSON_PATH_REGEX, {
    message:
      'Le chemin doit comporter au moins un point et uniquement des segments alphanumériques, tirets ou underscores (ex. inetOrgPerson.mail)',
  })
  @IsOptional()
  @ApiProperty({
    required: false,
    example: 'additionalFields.mailPersonnel',
    description: "Chemin JSON (point) vers l'e-mail personnel de l'identité (envois template)",
  })
  public recipientJsonPathEmailPersonnel?: string;

  @ValidateIf((_, v) => v !== undefined && v !== null && String(v).trim() !== '')
  @IsString()
  @Matches(MAIL_RECIPIENT_JSON_PATH_REGEX, {
    message:
      'Le chemin doit comporter au moins un point et uniquement des segments alphanumériques, tirets ou underscores (ex. inetOrgPerson.mail)',
  })
  @IsOptional()
  @ApiProperty({
    required: false,
    example: 'inetOrgPerson.mail',
    description: "Chemin JSON (point) vers l'e-mail principal de l'identité (envois template)",
  })
  public recipientJsonPathEmailPrincipal?: string;
}
