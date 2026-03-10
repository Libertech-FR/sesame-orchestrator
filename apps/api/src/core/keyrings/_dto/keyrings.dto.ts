import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIP, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CustomFieldsDto } from '~/_common/abstracts/dto/custom-fields.dto';

export class KeyringsCreateDto extends CustomFieldsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  public name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  public token: string;

  @IsString({ each: true })
  @IsIP(4, { each: true })
  public allowedNetworks?: string[];

  @IsDateString()
  public suspendedAt?: Date;

  @IsString({ each: true })
  @IsOptional()
  public roles?: string[];
}

export class KeyringsDto extends KeyringsCreateDto {
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string;
}
