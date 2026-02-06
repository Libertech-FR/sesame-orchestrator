import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { DataStatusEnum } from '../../_enums/data-status';

export class ActivationDto {
  @IsMongoId()
  @ApiProperty({ example: '66d80ab41821baca9bf965b2', description: 'Id of identity', type: String })
  public id: string

  @IsIn([DataStatusEnum.ACTIVE, DataStatusEnum.INACTIVE], {
    message: 'Le statut doit être ACTIVE ou INACTIVE.'
  })
  @ApiProperty({
    example: DataStatusEnum.ACTIVE,
    description: 'Desired status of the identity: ACTIVE or INACTIVE',
    enum: [DataStatusEnum.ACTIVE, DataStatusEnum.INACTIVE],
    type: Number,
  })
  public status: DataStatusEnum
}
