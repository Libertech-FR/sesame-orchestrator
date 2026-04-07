import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class InitManyDto {
  @ApiProperty({ description: 'Envoie la demande d init à plusieurs identitées. Id des identities' })
  @IsArray()
  public ids: Types.ObjectId[];

  @ApiProperty({ required: false, example: 'initaccount', description: 'Nom du template mailer à utiliser' })
  @IsOptional()
  @IsString()
  public template?: string;

  @ApiProperty({ required: false, example: { appName: 'Sesame' }, description: 'Variables additionnelles injectées dans le template' })
  @IsOptional()
  @IsObject()
  public variables?: Record<string, string>;
}
