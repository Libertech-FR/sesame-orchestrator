import { IsEmail, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MailSettingsDto {
  @IsUrl({ protocols: ['smtp', 'smtps'], require_protocol: true })
  @ApiProperty({ example: 'smtp://smscsim.smpp.org:25', description: 'Serveur SMTP', type: String })
  public host: string;
  @IsEmail()
  @ApiProperty({ example: 'no-reply@mondomaine', description: 'Emetteur', type: String })
  public sender: string;
  @IsString()
  @ApiProperty({ example: 'monlogin@mondomaine', description: 'username', type: String })
  public username: string;
  @IsString()
  @ApiProperty({ example: 'myPassword', description: 'password', type: String })
  public password: string;
}
