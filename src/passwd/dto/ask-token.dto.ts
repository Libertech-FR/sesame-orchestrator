import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class AskTokenDto {
  @IsString()
  @ApiProperty({ example: 'paul.bismuth', description: 'User  Uid' })
  uid: string;

  @IsString()
  @ApiProperty({
    example: 'monemail@mondomaine.com',
    description: 'secondary mail',
  })
  mail: string;
}
