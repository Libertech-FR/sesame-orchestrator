import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ForcePasswordDto {
  @IsString()
  @ApiProperty({ example: '66d80ab41821baca9bf965b2', description: 'User object id', type: String })
  public id: string;

  @IsString()
  @ApiProperty({ example: 'MyNewPassword', description: 'New password', type: String })
  public newPassword: string;
}
