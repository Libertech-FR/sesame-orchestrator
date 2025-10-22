import { IsEnum, IsMongoId, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ActionType } from '../_enum/action-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteJobDto {
  @IsNotEmpty()
  @IsEnum(ActionType)
  @ApiProperty({ type: String })
  public action: ActionType;

  @IsMongoId()
  @IsOptional()
  @ApiProperty({ example: 'paul.bismuth', description: 'User object id', type: String })
  public id?: string;

  @IsOptional()
  @IsObject()
  @ApiProperty({ type: Object })
  public payload: Record<string | number, any>;
}
