import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiBadRequestResponse, ApiExtraModels, ApiNotFoundResponse, ApiOperation, ApiOperationOptions, getSchemaPath } from '@nestjs/swagger';
import { ApiOkResponse, ApiResponseOptions } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ErrorSchemaDto } from '~/_common/dto/error-schema.dto';
import { NotFoundDto } from '~/_common/dto/not-found.dto';

export const ApiUpdatedResponseDecorator = <TModel extends Type<NonNullable<unknown>>>(
  model: TModel,
  options?: {
    responseOptions?: ApiResponseOptions | null | undefined,
    badRequestOptions?: ApiResponseOptions | null | undefined,
    notFoundOptions?: ApiResponseOptions | null | undefined,
    operationOptions?: ApiOperationOptions | null | undefined,
  },
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiExtraModels(ErrorSchemaDto),
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
      description: 'L\'enregistrement a été mis à jour avec succès',
      ...options?.responseOptions,
    }),
    ApiBadRequestResponse({
      description: 'Validation du schéma failed',
      schema: {
        $ref: getSchemaPath(ErrorSchemaDto),
      },
      ...options?.badRequestOptions,
    }),
    ApiNotFoundResponse({
      description: 'Impossible de trouver l\'entrée ciblée',
      schema: {
        $ref: getSchemaPath(NotFoundDto),
      },
      ...options?.notFoundOptions,
    }),
    ApiOperation({ summary: `Mise à jour d'une entrée <${model.name.replace(/Dto$/, '')}>`, ...options?.operationOptions }),
  );
};
