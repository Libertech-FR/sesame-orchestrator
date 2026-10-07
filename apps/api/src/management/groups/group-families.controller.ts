import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  FilterOptions,
  FilterSchema,
  SearchFilterOptions,
  SearchFilterSchema,
} from '@tacxou/nestjs_module_restools/search-filter-schema';
import { Response } from 'express';
import { Types } from 'mongoose';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator';
import { ApiDeletedResponseDecorator } from '~/_common/decorators/api-deleted-response.decorator';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { ApiUpdateDecorator } from '~/_common/decorators/api-update.decorator';
import { UseRoles } from '~/_common/decorators/use-roles.decorator';
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { GroupFamiliesCreateDto, GroupFamiliesDto, GroupFamiliesUpdateDto } from './_dto/group-families.dto';
import { GroupFamiliesService } from './group-families.service';

@ApiTags('management/group-families')
@Controller('group-families')
export class GroupFamiliesController extends AbstractController {
  protected static readonly projection: PartialProjectionType<GroupFamiliesDto> = {
    name: 1,
    description: 1,
    color: 1,
  };

  protected static readonly searchFields: PartialProjectionType<GroupFamiliesDto> = {
    name: 1,
    description: 1,
  };

  public constructor(private readonly _service: GroupFamiliesService) {
    super();
  }

  @Post()
  @UseRoles({
    resource: '/management/group-families',
    action: AC_ACTIONS.CREATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiCreateDecorator(GroupFamiliesCreateDto, GroupFamiliesDto)
  public async create(@Res() res: Response, @Body() body: GroupFamiliesCreateDto): Promise<Response> {
    const data = await this._service.create(body);
    return res.status(HttpStatus.CREATED).json({
      statusCode: HttpStatus.CREATED,
      data,
    });
  }

  @Get()
  @UseRoles({
    resource: '/management/group-families',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiPaginatedDecorator(PickProjectionHelper(GroupFamiliesDto, GroupFamiliesController.projection))
  public async search(
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
    @Query('search') search: string,
  ): Promise<Response> {
    const searchFilter = {};

    if (search && search.trim().length > 0) {
      searchFilter['$or'] = Object.keys(GroupFamiliesController.searchFields).map((key) => {
        return { [key]: { $regex: `^${search}`, $options: 'i' } };
      });
    }

    const [data, total] = await this._service.findAndCount(
      { ...searchFilter, ...searchFilterSchema },
      GroupFamiliesController.projection,
      searchFilterOptions,
    );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    });
  }

  @Get('groups-count')
  @UseRoles({
    resource: '/management/group-families',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Nombre de groupes par famille' })
  public async groupsCount(@Res() res: Response): Promise<Response> {
    const data = await this._service.countGroupsByFamily();
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Get(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/management/group-families',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiReadResponseDecorator(GroupFamiliesDto)
  public async read(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.findById(_id);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Patch(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/management/group-families',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiUpdateDecorator(GroupFamiliesUpdateDto, GroupFamiliesDto)
  public async update(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: GroupFamiliesUpdateDto,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.updateFamily(_id, body);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Delete(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/management/group-families',
    action: AC_ACTIONS.DELETE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiDeletedResponseDecorator(GroupFamiliesDto)
  public async remove(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.removeFamily(_id);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }
}
