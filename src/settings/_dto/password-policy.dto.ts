import { ApiProperty } from '@nestjs/swagger';
import {IsNumber, IsBoolean, IsString} from 'class-validator';

export class PasswordPoliciesDto {
  @IsNumber()
  @ApiProperty({ example: '8', description: 'Password minimal Length', type: Number })
  public len: number=10;

  @IsNumber()
  @ApiProperty({ example: '1', description: 'Minimal amount of letters in uppercase', type: Number })
  public hasUpperCase: number=1;

  @IsNumber()
  @ApiProperty({ example: '1', description: 'Minimal amount of letters in lowercase', type: Number })
  public hasLowerCase: number=1;

  @IsNumber()
  @ApiProperty({ example: '1', description: 'Minimal amount of numbers', type: Number })
  public hasNumbers: number=1;

  @IsNumber()
  @ApiProperty({ example: '1', description: 'Minimal amount of special characters', type: Number })
  public hasSpecialChars: number=1;

  @IsNumber()
  @ApiProperty({ example: '30', description: 'Minimal complexity (entropy), Below this number the password wont be accepted', type: Number })
  public minComplexity: number=30;

  @IsNumber()
  @ApiProperty({ example: '70', description: 'Good complexity (entropy), Upper this number the password is considered  good', type: Number })
  public goodComplexity: number=70;

  @IsBoolean()
  @ApiProperty({ example: true, description: 'Teh password will be checked on Pwned', type: Boolean })
  public checkPwned: boolean=true;

  @IsBoolean()
  @ApiProperty({ example: true, description: 'Mote de passe peut etre reinitialisé par sms', type: Boolean })
  public resetBySms: boolean=false;

  @IsString()
  @ApiProperty({ example: 'https://monsite.com', description: 'Après un changement ou reset reussi le navigateur sera redirigé', type: Number })
  public redirectUrl: string="";
  @IsString()
  @ApiProperty({ example: 'interOrgPerson.mail', description: 'Attribut de l email alternatif pour envoi message', type: String })
  public emailAttribute: string="";
  @ApiProperty({ example: 'interOrgPerson.mobile', description: 'Attribut de l email alternatif pour envoi message', type: String })
  public mobileAttribute: string="";

  @IsNumber()
  @ApiProperty({ example: '900', description: 'TTL du code de reset ( en secondes)', type: Number })
  public resetCodeTTL: number=900;

  @IsNumber()
  @ApiProperty({ example: '604800', description: 'TTL du jeton d\'initialisation ( en secondes)', type: Number })
  public initTokenTTL: number=604800;
}
