import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiQuery, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseOptions } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ApiPaginatedResponseDecorator } from '~/_common/decorators/api-paginated-response.decorator';
import { PaginatedFilterDto } from '~/_common/dto/paginated-filter.dto';

export const ApiPaginatedDecorator = <TModel extends Type<NonNullable<unknown>>>(
  model: TModel,
  options?: {
    responseOptions?: ApiResponseOptions | null | undefined;
  },
) => {
  return applyDecorators(
    ApiQuery({
      name: 'limit',
      type: Number,
      required: false,
      description: "Limite le nombre d'éléments retournés",
    }),
    ApiQuery({
      name: 'skip',
      type: Number,
      required: false,
      description: 'Skip les N premiers éléments',
    }),
    ApiQuery({
      name: 'page',
      type: Number,
      required: false,
      description: 'Skip les N premiers éléments en fonction de la limite et de la page (incompatible avec skip)',
    }),
    ApiExtraModels(PaginatedFilterDto),
    ApiQuery({
      required: false,
      name: 'filters',
      style: 'deepObject',
      explode: true,
      type: 'object',
      schema: {
        $ref: getSchemaPath(PaginatedFilterDto),
      },
      description: 'Filtres de recherche, voir la documentation de chaque endpoint pour plus de détails',
    }),
    ApiPaginatedResponseDecorator(model, { responseOptions: options?.responseOptions }),
  );
};
