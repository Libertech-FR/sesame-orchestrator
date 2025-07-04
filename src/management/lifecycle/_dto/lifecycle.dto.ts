import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';
import { Types } from 'mongoose';
import { IdentityLifecycle } from '~/management/identities/_enums/lifecycle.enum';

export class LifecycleDto {
  @ApiProperty({
    description: 'Unique identifier',
    type: String,
  })
  public _id: Types.ObjectId;

  @ApiProperty({
    description: 'Reference to the identity',
    type: String,
  })
  @IsNotEmpty()
  public identityId: Types.ObjectId;

  @ApiProperty({
    description: 'Lifecycle state',
    enum: IdentityLifecycle,
  })
  @IsEnum(IdentityLifecycle)
  @IsNotEmpty()
  public lifecycle: IdentityLifecycle;

  @ApiProperty({
    description: 'Creation date',
    type: Date,
  })
  @IsDateString()
  public createdAt: Date;
}

export class LifecycleCreateDto {
  @ApiProperty({
    description: 'Reference to the identity',
    type: String,
  })
  @IsNotEmpty()
  public identityId: Types.ObjectId;

  @ApiProperty({
    description: 'Lifecycle state',
    enum: IdentityLifecycle,
  })
  @IsEnum(IdentityLifecycle)
  @IsNotEmpty()
  public lifecycle: IdentityLifecycle;
}

export class LifecycleUpdateDto extends PartialType(LifecycleCreateDto) {
  @ApiPropertyOptional({
    description: 'Lifecycle state',
    enum: IdentityLifecycle,
  })
  @IsEnum(IdentityLifecycle)
  @IsOptional()
  public lifecycle?: IdentityLifecycle;
}
