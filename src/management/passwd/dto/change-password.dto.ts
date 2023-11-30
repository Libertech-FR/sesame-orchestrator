import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ActionType {
  CHANGEPWD = 'CHANGEPWD',
  ADDIDENT = 'ADDIDENT',
  UPDATEIDENT = 'UPDATEIDENT',
  DELIDENT = 'DELIDENT',
}

export class ChangePasswordDto {
  @IsString()
  @ApiProperty({ example: 'paul.bismuth', description: 'User  Uid' })
  uid: string;

  @IsString()
  @ApiProperty({ example: 'MyOldPassword', description: 'Old Password' })
  oldPassword: string;

  @IsString()
  @ApiProperty({ example: 'MyNewPassword', description: 'New Password' })
  newPassword: string;
}

export type BackendActionType = {
  CHANGEPWD: ChangePasswordDto;
  ADDIDENT: any;
  UPDATEIDENT: any;
  DELIDENT: any;
};
