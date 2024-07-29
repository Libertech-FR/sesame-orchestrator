import { ApiProperty } from '@nestjs/swagger';
import {IsNumber, IsString} from 'class-validator';

export class ResetByCodeDto {
  @IsString()
  @ApiProperty({ example: '3F4AC...', description: 'Token received by initreset' })
  token: string;

  @IsNumber
  @ApiProperty({ example: '123456', description: 'Code received by email or Sms' })
  code: number;
}
