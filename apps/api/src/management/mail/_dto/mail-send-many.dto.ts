import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class MailSendManyDto {
  @ApiProperty({ description: 'Ids des identities destinataires' })
  @IsArray()
  public ids: Types.ObjectId[];

  @ApiProperty({ description: 'Nom du template mailer (ex: initaccount)' })
  @IsString()
  public template: string;

  @ApiProperty({ description: 'Sujet du mail (en-tête SMTP, distinct des variables du template)' })
  @IsString()
  @IsNotEmpty()
  public subject: string;

  @ApiProperty({ required: false, description: 'Variables additionnelles injectées dans le template' })
  @IsOptional()
  @IsObject()
  public variables?: Record<string, string>;

  @ApiProperty({
    required: false,
    isArray: true,
    enum: ['principal', 'personnel'],
    description:
      'Adresses destinataires via les chemins JSON SMTP (e-mail principal et/ou personnel). Plusieurs valeurs = envoi aux deux adresses lorsqu’elles existent.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['principal', 'personnel'], { each: true })
  public recipientAddressSources?: ('principal' | 'personnel')[];
}
