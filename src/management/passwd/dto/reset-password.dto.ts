import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class ResetPasswordDto {
  @IsString()
  @ApiProperty({
    example:
      'S9nv9vjxdW7bS0haoWUmdJ3XPbSJ7dSdRj2ND1z9RvqLK/sF1LKZpfnWDvLX1dZuG0WGEyAb9A==',
    description: 'Token',
  })
  token: string;

  @IsString()
  @ApiProperty({ example: 'MyNewPassword', description: 'New Password' })
  newPassword: string;
}
