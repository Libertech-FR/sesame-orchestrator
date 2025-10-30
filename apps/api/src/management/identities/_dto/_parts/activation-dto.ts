import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class ActivationDto {
  @IsString()
  @ApiProperty({ example: '66d80ab41821baca9bf965b2', description: 'Id of identity', type: String })
  public id: string;

  @IsBoolean()
  @ApiProperty({ example: 'true', description: 'true or false to enable or disable the identity', type: String })
  public status: boolean;
}
