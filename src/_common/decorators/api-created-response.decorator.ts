import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOperation,
  ApiOperationOptions,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiResponseOptions } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ErrorSchemaDto } from '~/_common/dto/error-schema.dto';

export const ApiCreatedResponseDecorator = <TModel extends Type<NonNullable<unknown>>>(
  model: TModel,
  options?: {
    responseOptions?: ApiResponseOptions | null | undefined;
    operationOptions?: ApiOperationOptions | null | undefined;
  },
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiExtraModels(ErrorSchemaDto),
    ApiCreatedResponse({
      schema: {
        properties: {
          statusCode: {
            type: 'number',
            enum: [HttpStatus.CREATED],
          },
          data: {
            $ref: getSchemaPath(model),
          },
        },
      },
      description: "L'enregistrement a été créé avec succès",
      ...options?.responseOptions,
    }),
    ApiBadRequestResponse({
      description: 'Validation du schéma failed',
      schema: {
        $ref: getSchemaPath(ErrorSchemaDto),
      },
    }),
    ApiOperation({
      summary: `Création d'une nouvelle entrée <${model.name.replace(/Dto$/, '')}>`,
      ...options?.operationOptions,
    }),
  );
};
