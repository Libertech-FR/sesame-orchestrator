import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class InitManyDto {
  @ApiProperty({ description: 'Envoie la demande d init à plusieurs identitées. Id des identities' })
  @IsArray()
  public ids: Types.ObjectId[];
}
