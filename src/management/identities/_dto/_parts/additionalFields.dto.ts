import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class additionalFieldsPartDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
    },
  })
  public objectClasses: string[] = [];

  @ApiProperty({
    type: Object,
    name: 'attributes',
  })
  @IsOptional()
  public attributes: { [key: string]: any } = {};

  @ApiProperty({
    type: Object,
    name: 'validations',
  })
  public validations?: { [key: string]: { [key: string]: string } };
}
