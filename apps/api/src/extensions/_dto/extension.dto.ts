import { Type } from 'class-transformer'
import { IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator'

export class ExtensionSettingsAppServiceMetadataV1 {
  @IsDefined()
  @IsString()
  public target: string

  @IsOptional()
  @IsString()
  public mainModule: string = 'ExtensionModule'
}

export class ExtensionSettingsMetadataV1 {
  @ValidateNested()
  @Type(() => ExtensionSettingsAppServiceMetadataV1)
  public app: ExtensionSettingsAppServiceMetadataV1

  @ValidateNested()
  @Type(() => ExtensionSettingsAppServiceMetadataV1)
  public service: ExtensionSettingsAppServiceMetadataV1
}

export class ExtensionInformationMetadataV1 {
  @IsString()
  public name: string

  @IsString()
  public author: string

  @IsString()
  public version: string
}

export class ExtensionFileV1 {
  @IsDefined()
  @IsEnum(['1'])
  public version: string

  @IsDefined()
  @ValidateNested()
  @Type(() => ExtensionInformationMetadataV1)
  public information: ExtensionInformationMetadataV1

  @IsDefined()
  @ValidateNested()
  @Type(() => ExtensionSettingsMetadataV1)
  public settings: ExtensionSettingsMetadataV1
}
