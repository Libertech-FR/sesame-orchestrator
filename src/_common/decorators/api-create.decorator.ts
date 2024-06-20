import { applyDecorators, Type } from '@nestjs/common';
import { ApiBodyOptions, ApiOperationOptions } from '@nestjs/swagger';
import { ApiResponseOptions } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ApiBodyDecorator } from '~/_common/decorators/api-body.decorator';
import { ApiCreatedResponseDecorator } from '~/_common/decorators/api-created-response.decorator';

export const ApiCreateDecorator = <TModel extends Type<NonNullable<unknown>>>(
  bodyModel: TModel,
  responseModel: TModel,
  options?: {
    bodyOptions?: ApiBodyOptions | null | undefined,
    responseOptions?: ApiResponseOptions | null | undefined,
    operationOptions?: ApiOperationOptions | null | undefined,
  },
) => {
  return applyDecorators(
    ApiBodyDecorator(bodyModel, options?.bodyOptions),
    ApiCreatedResponseDecorator(responseModel, {
      responseOptions: options?.responseOptions,
      operationOptions: options?.operationOptions,
    }),
  );
};
