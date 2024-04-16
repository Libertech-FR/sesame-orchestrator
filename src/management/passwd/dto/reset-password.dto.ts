import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @ApiProperty({
    example: 'S9nv9vjxdW7bS0haoWUmdJ3XPbSJ7dSdRj2ND1z9RvqLK/sF1LKZpfnWDvLX1dZuG0WGEyAb9A==',
    description: 'Token',
  })
  token: string;
  @ApiProperty({ example: 'MyNewPassword', description: 'New Password' })
  @IsString()
  newPassword: string;
}
