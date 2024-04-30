import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsMongoId, IsObject, IsString } from 'class-validator';
import { Types } from 'mongoose';
import { CustomFieldsDto } from '~/_common/abstracts/dto/custom-fields.dto';

export class JobsCreateDto extends CustomFieldsDto {
  @IsString()
  @ApiProperty()
  public jobId: string;

  @IsString()
  @ApiProperty()
  public action: string;

  @IsMongoId()
  @ApiProperty()
  public concernedTo: Types.ObjectId;

  @IsMongoId()
  @ApiProperty()
  public task: Types.ObjectId;

  @IsString()
  @ApiProperty()
  public comment: string;

  @IsObject()
  @ApiProperty()
  public params: object;

  @IsObject()
  @ApiProperty()
  public result: object;
}

export class JobsDto extends JobsCreateDto {
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string;
}

export class JobsUpdateDto extends PartialType(JobsCreateDto) { }
