import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean } from 'class-validator';

export class PasswordPoliciesDto {
  @IsNumber()
  @ApiProperty({ example: '8', description: 'Password minimal Length', type: Number })
  public len: Number;

  @IsNumber()
  @ApiProperty({ example: '1', description: 'Minimal amount of letters in uppercase', type: Number })
  public hasUpperCase: Number;

  @IsNumber()
  @ApiProperty({ example: '1', description: 'Minimal amount of letters in lowercase', type: Number })
  public hasLowerCase: Number;

  @IsNumber()
  @ApiProperty({ example: '1', description: 'Minimal amount of numbers', type: Number })
  public hasNumbers: Number;

  @IsNumber()
  @ApiProperty({ example: '1', description: 'Minimal amount of special characters', type: Number })
  public hasSpecialChars: Number;

  @IsNumber()
  @ApiProperty({ example: '30', description: 'Minimal complexity (entropy), Below this number the password wont be accepted', type: Number })
  public minComplexity: Number;

  @IsNumber()
  @ApiProperty({ example: '70', description: 'Good complexity (entropy), Upper this number the password is considered  good', type: Number })
  public goodComplexity: Number;

  @IsBoolean()
  @ApiProperty({ example: true, description: 'Teh password will be checked on Pwned', type: Boolean })
  public checkPwned: Boolean;

  @IsNumber()
  @ApiProperty({ example: '10', description: 'after X bad logins the user will be banned for  bannedTime', type: Number })
  public maxRetry: Number;

  @IsNumber()
  @ApiProperty({ example: '3600', description: 'in Seconds', type: Number })
  public bannedTime: Number;
}
