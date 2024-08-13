import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ResetByCodeDto {
  @IsString()
  @ApiProperty({ example: '3F4AC...', description: 'Token received by initreset' })
  public token: string;

  @IsNumber()
  @ApiProperty({ example: '123456', description: 'Code received by email or Sms' })
  public code: number;

  @IsString()
  @ApiProperty({ example: 'hdfddyf18A', description: 'new password' })
  public newpassword: string;
}
