import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class MailSendManyDto {
  @ApiProperty({ description: 'Ids des identities destinataires' })
  @IsArray()
  public ids: Types.ObjectId[];

  @ApiProperty({ description: 'Nom du template mailer (ex: initaccount)' })
  @IsString()
  public template: string;

  @ApiProperty({ description: "Sujet du mail (en-tête SMTP, distinct des variables du template)" })
  @IsString()
  @IsNotEmpty()
  public subject: string;

  @ApiProperty({ required: false, description: 'Variables additionnelles injectées dans le template' })
  @IsOptional()
  @IsObject()
  public variables?: Record<string, string>;

  @ApiProperty({
    required: false,
    enum: ['principal', 'personnel'],
    description:
      'Si renseigné, adresse destinataire lue via le chemin JSON SMTP (e-mail principal ou e-mail personnel). Sinon, politique de mot de passe (emailAttribute).',
  })
  @IsOptional()
  @IsIn(['principal', 'personnel'])
  public recipientAddressSource?: 'principal' | 'personnel';
}
