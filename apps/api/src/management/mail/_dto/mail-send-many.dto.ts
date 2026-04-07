import { ApiProperty } from '@nestjs/swagger'
import { Types } from 'mongoose'
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator'

export class MailSendManyDto {
  @ApiProperty({ description: 'Ids des identities destinataires' })
  @IsArray()
  public ids: Types.ObjectId[]

  @ApiProperty({ description: 'Nom du template mailer (ex: initaccount)' })
  @IsString()
  public template: string

  @ApiProperty({ required: false, description: 'Variables additionnelles injectées dans le template' })
  @IsOptional()
  @IsObject()
  public variables?: Record<string, string>
}

