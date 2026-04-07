import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class InitAccountDto {
  @ApiProperty({ example: 'uid', description: 'paul.smith' })
  @IsString()
  public uid: string;

  @ApiProperty({ required: false, example: 'initaccount', description: 'Nom du template mailer à utiliser' })
  @IsOptional()
  @IsString()
  public template?: string;

  @ApiProperty({ required: false, example: { appName: 'Sesame' }, description: 'Variables additionnelles injectées dans le template' })
  @IsOptional()
  @IsObject()
  public variables?: Record<string, string>;
}
