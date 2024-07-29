import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class InitResetDto {
  @IsString()
  @ApiProperty({ example: 'paul.bismuth', description: 'User id' })
  uid: string;
}
