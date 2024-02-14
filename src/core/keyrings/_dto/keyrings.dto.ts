import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { CustomFieldsDto } from '~/_common/abstracts/dto/custom-fields.dto';
import { Prop } from '@nestjs/mongoose';

export class KeyringsCreateDto extends CustomFieldsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  public secretKey: string;

  @Prop({
    type: [String],
  })
  public allowedNetworks?: string[];

  @Prop({ type: Date })
  public suspendedAt?: Date;
}

export class KeyringsDto extends KeyringsCreateDto {
  @IsMongoId()
  @ApiProperty({ type: String })
  public _id: string;
}
