import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class ConcernedToPartDTO {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  public $ref: string;

  @IsMongoId()
  @ApiProperty()
  public id: Types.ObjectId;

  @IsString()
  @IsOptional()
  @ApiProperty()
  public name?: string;
}
