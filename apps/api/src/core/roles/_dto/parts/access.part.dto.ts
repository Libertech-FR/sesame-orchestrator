import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, Matches } from 'class-validator'
import { AC_ACTIONS, AC_POSSESSIONS } from '~/_common/types/ac-types'

export class AccessPartDTO {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @Matches(/^\/(?!.*\/$).+$/, {
    message: 'Le champ resource doit correspondre au chemin d\'accès d\'une route NestJS ex: "/core/roles" (doit commencer par / et ne pas finir par /)',
  })
  public resource: string

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  @IsEnum(AC_ACTIONS, { each: true })
  @ApiProperty({ enum: AC_ACTIONS })
  public action: AC_ACTIONS[]

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
