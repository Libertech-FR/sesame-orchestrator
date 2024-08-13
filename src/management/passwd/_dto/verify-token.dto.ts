import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyTokenDto {
  @ApiProperty({
    example: 'S9nv9vjxdW7bS0haoWUmdJ3XPbSJ7dSdRj2ND1z9RvqLK/sF1LKZpfnWDvLX1dZuG0WGEyAb9A==',
    description: 'token received by getToken',
  })
  @IsString()
  public token: string;
}
