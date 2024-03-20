import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ActionType } from '../_enum/action-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteJobDto {
  @IsNotEmpty()
  @IsEnum(ActionType)
  @ApiProperty({ type: String })
  public action: ActionType;

  @IsOptional()
  @IsObject()
  @ApiProperty({ type: Object })
  public payload: Record<string | number, any>;
}
