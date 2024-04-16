import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString } from 'class-validator';

export class AskTokenDto {
  @IsMongoId()
  @ApiProperty({ example: 'paul.bismuth', description: 'User id' })
  id: string;
  @ApiProperty({ example: 'monemail@mondomaine.com', description: 'secondary mail' })
  @IsString()
  mail: string;
}
