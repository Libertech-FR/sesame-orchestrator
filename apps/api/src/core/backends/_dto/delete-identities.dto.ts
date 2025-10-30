import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class DeleteIdentitiesDto {
  @IsArray()
  @ApiProperty({ type: Array })
  public payload: string[];
}
