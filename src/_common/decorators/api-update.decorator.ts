import { applyDecorators, Type } from '@nestjs/common';
import { ApiBodyOptions } from '@nestjs/swagger';
import { ApiBodyDecorator } from '~/_common/decorators/api-body.decorator';
import { ApiResponseOptions } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ApiUpdatedResponseDecorator } from '~/_common/decorators/api-updated-response.decorator';

export const ApiUpdateDecorator = <TModel extends Type<NonNullable<unknown>>>(
  bodyModel: TModel,
  responseModel: TModel,
  options?: {
    bodyOptions?: ApiBodyOptions | null | undefined;
    responseOptions?: ApiResponseOptions | null | undefined;
  },
) => {
  return applyDecorators(
    ApiBodyDecorator(bodyModel, options?.bodyOptions),
    ApiUpdatedResponseDecorator(responseModel, { responseOptions: options?.responseOptions }),
  );
};
