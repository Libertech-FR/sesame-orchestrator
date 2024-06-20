import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiNotFoundResponse, ApiOperation, ApiOperationOptions, getSchemaPath } from '@nestjs/swagger';
import { ApiOkResponse, ApiResponseOptions } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { NotFoundDto } from '~/_common/dto/not-found.dto';

export const ApiDeletedResponseDecorator = <TModel extends Type<NonNullable<unknown>>>(
  model: TModel,
  options?: {
    responseOptions?: ApiResponseOptions | null | undefined,
    notFoundOptions?: ApiResponseOptions | null | undefined,
    operationOptions?: ApiOperationOptions | null | undefined,
  },
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiExtraModels(NotFoundDto),
    ApiOkResponse({
      schema: {
        properties: {
          statusCode: {
            type: 'number',
            enum: [HttpStatus.OK],
          },
          data: {
            $ref: getSchemaPath(model),
          },
        },
      },
      description: 'L\'enregistrement a été supprimé avec succès',
      ...options?.responseOptions,
    }),
    ApiNotFoundResponse({
      description: 'Impossible de trouver l\'entrée ciblée',
      schema: {
        $ref: getSchemaPath(NotFoundDto),
      },
      ...options?.notFoundOptions,
    }),
    ApiOperation({ summary: `Suppression d'une entrée <${model.name.replace(/Dto$/, '')}>`, ...options?.operationOptions }),
  );
};
