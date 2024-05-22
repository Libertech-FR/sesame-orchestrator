import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @ApiProperty({ example: 'paul.bismuth', description: 'User object id', type: String })
  public uid: string;

  @IsString()
  @ApiProperty({ example: 'MyOldPassword', description: 'Old password', type: String })
  public oldPassword: string;

  @IsString()
  @ApiProperty({ example: 'MyNewPassword', description: 'New password', type: String })
  public newPassword: string;
}
