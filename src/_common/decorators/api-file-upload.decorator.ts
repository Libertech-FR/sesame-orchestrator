import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBody,
  ApiBodyOptions,
  ApiConsumes,
  ApiExtraModels,
  ApiOperationOptions,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiResponseOptions } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ApiBodyDecorator } from '~/_common/decorators/api-body.decorator';
import { ApiCreatedResponseDecorator } from '~/_common/decorators/api-created-response.decorator';

export const ApiFileUploadDecorator = <TModel extends Type<NonNullable<unknown>>>(
  uploadModel: Type<NonNullable<unknown>>,
  bodyModel: TModel,
  responseModel: TModel,
  options?: {
    bodyOptions?: ApiBodyOptions | null | undefined;
    responseOptions?: ApiResponseOptions | null | undefined;
    operationOptions?: ApiOperationOptions | null | undefined;
    consumesOptions?: string[];
  },
) => {
  const consumes = options?.consumesOptions || ['multipart/form-data'];

  return applyDecorators(
    ApiExtraModels(uploadModel),
    ApiExtraModels(bodyModel),
    ApiBody({
      schema: {
        type: 'object',
        allOf: [{ $ref: getSchemaPath(bodyModel) }, { $ref: getSchemaPath(uploadModel) }],
        // properties: {
        //   // comment: { type: 'string' },
        //   // outletId: { type: 'integer' },

        //   file: {
        //     type: 'string',
        //     format: 'binary',
        //   },
        // },
      },
      description: "Corps de création de l'enregistrement",
      ...options?.bodyOptions,
    }),
    ApiCreatedResponseDecorator(responseModel, {
      responseOptions: options?.responseOptions,
      operationOptions: options?.operationOptions,
    }),
    ApiConsumes(...consumes),
  );
};
