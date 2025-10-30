import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SmsSettingsDto {
  @IsString()
  @ApiProperty({ example: 'smpp://smscsim.smpp.org:2775', description: 'Serveur Sms (protocole SMPP)', type: String })
  public host: string;

  @IsString()
  @ApiProperty({ example: 'WkFSJlDXGryAJG1', description: 'SystemId (fournit par votre provider)', type: String })
  public systemId: string;

  @IsString()
  @ApiProperty({ example: 'ZsvyNgf8', description: 'Password (fournit par votre provider)', type: String })
  public password: string;

  @IsString()
  @ApiProperty({ example: 'FR', description: 'Code region', type: String })
  public regionCode: string = 'FR';

  @IsString()
  @ApiProperty({
    example: 'SMPP.ORG',
    description: 'Adresse emetteur (11 caracteres max)',
    type: String,
    maxLength: 11,
  })
  public sourceAddr: string;
}
