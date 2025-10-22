import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class SyncIdentitiesDto {
  @IsArray()
  @ApiProperty({ type: Array })
  public payload: string[];
}
