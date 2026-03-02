import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsNumber, IsDate, IsOptional, IsArray, IsEnum, IsUrl, IsDataURI } from 'class-validator'
import { AC_ACTIONS, AC_POSSESSIONS } from '~/_common/types/ac-types'

export class AccessPartDTO {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @IsDataURI()
  public resource: string

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  @IsEnum(AC_ACTIONS, { each: true })
  @ApiProperty({ enum: AC_ACTIONS })
  public actions: AC_ACTIONS[]

  @IsString()
  @IsOptional()
  @IsEnum(AC_POSSESSIONS)
  @ApiProperty({ enum: AC_POSSESSIONS })
  public possession?: AC_POSSESSIONS

  @IsString({ each: true })
  @IsOptional()
  @IsArray()
  @ApiProperty()
  public attributes?: string[]
}
