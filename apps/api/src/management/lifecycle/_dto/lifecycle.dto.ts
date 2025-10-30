import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';
import { IdentityLifecycleDefault } from '~/management/identities/_enums/lifecycle.enum';

export class LifecycleCreateDto {
  @ApiProperty({
    description: 'Reference to the identity',
    type: String,
  })
  @IsNotEmpty()
  public refId: Types.ObjectId;

  @ApiProperty({
    description: 'Lifecycle state',
    enum: IdentityLifecycleDefault,
  })
  @IsNotEmpty()
  public lifecycle: IdentityLifecycleDefault | string;

  @ApiProperty({
    description: 'Date of the lifecycle event',
    type: Date,
  })
  @IsDateString()
  public date: Date;
}

export class LifecycleDto extends LifecycleCreateDto {
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string;
}

export class LifecycleUpdateDto extends PartialType(LifecycleCreateDto) { }
