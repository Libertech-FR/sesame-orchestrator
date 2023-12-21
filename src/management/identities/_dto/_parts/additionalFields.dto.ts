import { ApiProperty } from '@nestjs/swagger';

export class additionalFieldsPartDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
    },
  })
  objectClasses: string[];

  @ApiProperty({
    type: 'object',
    name: 'attributes',
  })
  attributes: { [key: string]: any };
}
