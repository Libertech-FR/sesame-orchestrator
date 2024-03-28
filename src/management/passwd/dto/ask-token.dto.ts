import { IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class AskTokenDto {
    @IsString()
    @ApiProperty({ example: 'paul.bismuth',description: 'User  Uid' })
    uid: string;
    @ApiProperty({ example: 'monemail@mondomaine.com',description: 'secondary mail' })
    @IsString()
    mail: string
}