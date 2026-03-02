import { AbstractController } from "~/_common/abstracts/abstract.controller"
import { RolesService } from "./roles.service"
import { ApiParam, ApiTags } from "@nestjs/swagger"
import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common"
import { ApiCreateDecorator } from "~/_common/decorators/api-create.decorator"
import { RolesCreateDto, RolesDto } from "./_dto/roles.dto"
import { Response } from "express"
import { ApiPaginatedDecorator } from "~/_common/decorators/api-paginated.decorator"
import { PickProjectionHelper } from "~/_common/helpers/pick-projection.helper"
import { PartialProjectionType } from "~/_common/types/partial-projection.type"
import { FilterOptions, FilterSchema, ObjectIdValidationPipe, SearchFilterOptions, SearchFilterSchema } from "~/_common/restools"
import { ApiReadResponseDecorator } from "~/_common/decorators/api-read-response.decorator"
import { Types } from "mongoose"
import { ApiUpdateDecorator } from "~/_common/decorators/api-update.decorator"
import { AgentsDto, AgentsUpdateDto } from "../agents/_dto/agents.dto"
import { ApiDeletedResponseDecorator } from "~/_common/decorators/api-deleted-response.decorator"
import { UseRoles } from "~/_common/decorators/use-roles.decorator"
import { AC_ACTIONS, AC_ADMIN_ROLE, AC_DEFAULT_POSSESSION, AC_GUEST_ROLE } from "~/_common/types/ac-types"
import { Roles } from "./_schemas/roles.schema"

@ApiTags('core/roles')
@Controller('roles')
export class RolesController extends AbstractController {
  protected static readonly projection: PartialProjectionType<RolesDto> = {
    name: 1,
    displayName: 1,
  }

  protected static readonly searchFields: PartialProjectionType<any> = {
    name: 1,
    displayName: 1,
    description: 1,
  };

  public constructor(private readonly _service: RolesService) {
    super()
  }

  @Get('list')
  @UseRoles({
    resource: 'core/roles',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  public async list(
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.find(null, { name: 1, displayName: 1 }) as unknown as Roles[]

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: [
        {
          name: AC_ADMIN_ROLE,
          displayName: AC_ADMIN_ROLE.charAt(0).toUpperCase() + AC_ADMIN_ROLE.slice(1),
        },
        {
          name: AC_GUEST_ROLE,
          displayName: AC_GUEST_ROLE.charAt(0).toUpperCase() + AC_GUEST_ROLE.slice(1),
        },
        ...data.map((role) => ({
          name: role.name,
          displayName: role.displayName || role.name.charAt(0).toUpperCase() + role.name.slice(1),
        })),
      ],
    })
  }

  @Get('resources')
  @UseRoles({
    resource: 'core/roles',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  public async resources(
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.getResources()

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    })
  }

  @Get()
  @UseRoles({
    resource: 'core/roles',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiPaginatedDecorator(PickProjectionHelper(RolesDto, RolesController.projection))
  public async search(
    @Res() res: Response,
    @Query('search') search: string,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response> {

    const searchFilter = {}

    if (search && search.trim().length > 0) {
      const searchRequest = {}
      searchRequest['$or'] = Object.keys(RolesController.searchFields).map((key) => {
        return { [key]: { $regex: `^${search}`, $options: 'i' } }
      }).filter(item => item !== undefined)
      searchFilter['$and'] = [searchRequest]
      searchFilter['$and'].push(searchFilterSchema)
    } else {
      Object.assign(searchFilter, searchFilterSchema)
    }

    const [data, total] = await this._service.findAndCount(
      searchFilter,
      RolesController.projection,
      searchFilterOptions,
    )
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    })
  }


  @Post()
  @UseRoles({
    resource: 'core/roles',
    action: AC_ACTIONS.CREATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiCreateDecorator(RolesCreateDto, RolesDto)
  public async create(@Res() res: Response, @Body() body: RolesCreateDto): Promise<Response> {
    const data = await this._service.create(body)
    return res.status(HttpStatus.CREATED).json({
      statusCode: HttpStatus.CREATED,
      data,
    })
  }

  @Get(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: 'core/roles',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiReadResponseDecorator(RolesDto)
  public async read(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.findById(_id)
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    })
  }

  @Patch(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: 'core/roles',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiUpdateDecorator(AgentsUpdateDto, AgentsDto)
  public async update(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: AgentsUpdateDto,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.update(_id, body)
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    })
  }

  @Delete(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: 'core/roles',
    action: AC_ACTIONS.DELETE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiDeletedResponseDecorator(AgentsDto)
  public async remove(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.delete(_id)
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    })
  }
}
