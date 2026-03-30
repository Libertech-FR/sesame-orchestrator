import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { Types } from 'mongoose';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiDeletedResponseDecorator } from '~/_common/decorators/api-deleted-response.decorator';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { Response } from 'express';
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper';
import {
  FilterOptions,
  FilterSchema,
  SearchFilterOptions,
  SearchFilterSchema,
} from '~/_common/restools';
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { KeyringsService } from '~/core/keyrings/keyrings.service';
import { KeyringsCreateDto, KeyringsDto } from '~/core/keyrings/_dto/keyrings.dto';
import { UseRoles } from '~/_common/decorators/use-roles.decorator';
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types';

@ApiTags('core/keyrings')
@Controller('keyrings')
export class KeyringsController extends AbstractController {
  protected static readonly projection: PartialProjectionType<KeyringsDto> = {
    token: 0,
    // allowedNetworks: 1,
    // suspendedAt: 1,
  };

  protected static readonly searchFields: PartialProjectionType<any> = {
    name: 1,
    roles: 1,
  };

  public constructor(private readonly _service: KeyringsService) {
    super();
  }

  @Post()
  @UseRoles({
    resource: '/core/keyrings',
    action: AC_ACTIONS.CREATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiCreateDecorator(KeyringsCreateDto, KeyringsDto)
  public async create(@Res() res: Response, @Body() body: KeyringsCreateDto): Promise<Response> {
    const data = await this._service.create(body);
    return res.status(HttpStatus.CREATED).json({
      statusCode: HttpStatus.CREATED,
      data,
    });
  }

  @Get()
  @UseRoles({
    resource: '/core/keyrings',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiPaginatedDecorator(PickProjectionHelper(KeyringsDto, KeyringsController.projection))
  public async search(
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
    @Query('search') search: string,
  ): Promise<Response> {
    const searchFilter = {}

    if (search && search.trim().length > 0) {
      searchFilter['$or'] = Object.keys(KeyringsController.searchFields).map((key) => {
        return { [key]: { $regex: `^${search}`, $options: 'i' } }
      }).filter(item => item !== undefined)
    }

    const [data, total] = await this._service.findAndCount(
      { ...searchFilter, ...searchFilterSchema },
      KeyringsController.projection,
      searchFilterOptions,
    );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    });
  }

  @Delete(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/core/keyrings',
    action: AC_ACTIONS.DELETE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiDeletedResponseDecorator(KeyringsDto)
  public async remove(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.delete(_id);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }
}
