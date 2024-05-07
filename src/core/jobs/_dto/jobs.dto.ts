import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';
import { CustomFieldsDto } from '~/_common/abstracts/dto/custom-fields.dto';
import { ConcernedToPartDTO } from './_parts/concerned-to.part.dto';

export class JobsCreateDto extends CustomFieldsDto {
  @IsString()
  @ApiProperty()
  public jobId: string;

  @IsString()
  @ApiProperty()
  public action: string;

  @ValidateNested()
  @Type(() => ConcernedToPartDTO)
  @IsNotEmpty()
  @ApiProperty({ type: ConcernedToPartDTO })
  public concernedTo: ConcernedToPartDTO;

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
