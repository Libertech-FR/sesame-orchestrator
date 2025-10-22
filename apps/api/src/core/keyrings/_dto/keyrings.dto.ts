import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIP, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
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
}

export class KeyringsDto extends KeyringsCreateDto {
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string;
}
