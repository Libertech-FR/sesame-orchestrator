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

  @ApiProperty({
    type: 'object',
    name: 'validations',
  })
  validations: { [key: string]: { [key: string]: string } };
}
