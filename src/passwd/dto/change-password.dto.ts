import { IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class ChangePasswordDto {
    @IsString()
    @ApiProperty({ example: 'paul.bismuth',description: 'User  Uid' })
    uid: string;
    @ApiProperty({ example: 'MyOldPassword',description: 'Old Password' })
    @IsString()
    oldPassword: number;
    @ApiProperty({ example: 'MyNewPassword',description: 'New Password' })
    @IsString()
    newPassword: string;
}