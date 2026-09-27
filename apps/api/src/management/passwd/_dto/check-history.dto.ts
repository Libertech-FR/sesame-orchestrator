import { ApiProperty } from '@nestjs/swagger';
import { IsString, ValidateIf } from 'class-validator';

export class CheckHistoryDto {
  @ValidateIf((o: CheckHistoryDto) => !o.uid)
  @IsString()
  @ApiProperty({
    example: '3F4AC...',
    description: "Token d'initialisation ou de reset (si uid/oldPassword absents)",
    required: false,
  })
  public token?: string;

  @ValidateIf((o: CheckHistoryDto) => !o.token)
  @IsString()
  @ApiProperty({ example: 'paul.bismuth', description: "Uid de l'utilisateur (si token absent)", required: false })
  public uid?: string;

  @ValidateIf((o: CheckHistoryDto) => !o.token)
  @IsString()
  @ApiProperty({ example: 'MyOldPassword', description: 'Mot de passe actuel (si token absent)', required: false })
  public oldPassword?: string;

  @IsString()
  @ApiProperty({ example: 'MyNewPassword', description: "Mot de passe à vérifier dans l'historique" })
  public newpassword: string;
}
