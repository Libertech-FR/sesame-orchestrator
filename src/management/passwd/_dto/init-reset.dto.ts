import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class InitResetDto {
  @IsString()
  @ApiProperty({ example: 'paul.bismuth', description: 'User id' })
  uid: string;

  @IsNumber()
  @ApiProperty({ example: 0, description: '0 = send by mail, 1 = send by SMS' })
  type: number;
}
