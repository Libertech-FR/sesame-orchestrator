import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class InitAccountDto {
  @ApiProperty({ example: 'uid', description: 'paul.smith' })
  @IsString()
  public uid: string;
}
