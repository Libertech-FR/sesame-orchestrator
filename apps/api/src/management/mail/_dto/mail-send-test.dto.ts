import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class MailSendTestDto {
  @ApiProperty({ description: 'Nom du template mailer (ex: mail_bienvenue)' })
  @IsString()
  @IsNotEmpty()
  public template: string;

  @ApiProperty({ description: 'Adresse e-mail destinataire du mail de test' })
  @IsEmail()
  public to: string;

  @ApiProperty({ required: false, description: 'Sujet du mail (préfixé par [TEST])' })
  @IsOptional()
  @IsString()
  public subject?: string;

  @ApiProperty({ required: false, description: 'Identité utilisée comme contexte du template' })
  @IsOptional()
  @IsMongoId()
  public identityId?: string;

  @ApiProperty({ required: false, description: 'Variables additionnelles injectées dans le template' })
  @IsOptional()
  @IsObject()
  public variables?: Record<string, string>;
}
