import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsString, ValidateNested } from 'class-validator'

export class ExtensionsListV1 {
  @IsString()
  public path: string

  @IsBoolean()
  public enabled: boolean
}

export class ExtensionsFileV1 {
  @IsEnum(['1'])
  public version: string

  @ValidateNested({ each: true })
  @Type(() => ExtensionsListV1)
  public list: ExtensionsListV1[]
}
