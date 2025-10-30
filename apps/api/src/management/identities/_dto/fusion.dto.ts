import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FusionDto {
  @IsString()
  @ApiProperty({ example: '66d80ab41821baca9bf965b2', description: 'Id of the first identity', type: String })
  public id1: string;

  @IsString()
  @ApiProperty({ example: '66d80ab41821baca9bf965b2', description: 'Id of the second identity', type: String })
  public id2: string;
}
