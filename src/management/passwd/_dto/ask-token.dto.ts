import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AskTokenDto {
  @IsString()
  @ApiProperty({ example: 'paul.bismuth', description: 'User id' })
  public uid: string;

  @ApiProperty({ example: 'monemail@mondomaine.com', description: 'secondary mail' })
  @IsString()
  public mail: string;
}
