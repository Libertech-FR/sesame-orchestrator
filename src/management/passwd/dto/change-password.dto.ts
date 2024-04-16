import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString } from 'class-validator';

export class ChangePasswordDto {
  @IsMongoId()
  @ApiProperty({ example: 'paul.bismuth', description: 'User object id', type: String })
  public id: string;

  @IsString()
  @ApiProperty({ example: 'MyOldPassword', description: 'Old password', type: String })
  public oldPassword: string;

  @IsString()
  @ApiProperty({ example: 'MyNewPassword', description: 'New password', type: String })
  public newPassword: string;
}
