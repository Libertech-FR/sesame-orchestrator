import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DEFAULT_SCHEMA_OPTIONS, FilterSchemaOptions } from '@tacxou/nestjs_module_restools/search-filter-schema';
import { filterSchemaWithGroups } from '~/_common/functions/filter-schema-groups.function';

/**
 * Remplace `SearchFilterSchema` de restools en ajoutant le support des groupes OU (`filters[i][...]`)
 *
 * @see filterSchemaWithGroups
 */
export const SearchFilterSchema = createParamDecorator(
  (options: FilterSchemaOptions | undefined, ctx: ExecutionContext) => {
    const resolved = { ...DEFAULT_SCHEMA_OPTIONS, ...options };
    const req = ctx.switchToHttp().getRequest();
    try {
      return filterSchemaWithGroups(req.query[resolved.queryKey], resolved);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  },
);
