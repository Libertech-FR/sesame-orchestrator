import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
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
import { BackendsService } from '~/core/backends/backends.service';
import {
  GroupsCreateDto,
  GroupsDto,
  GroupsMemberOfDto,
  GroupsMembersDto,
  GroupsSyncDto,
  GroupsUpdateDto,
} from './_dto/groups.dto';
import { GroupsService } from './groups.service';

@ApiTags('management/groups')
@Controller('groups')
export class GroupsController extends AbstractController {
  protected static readonly projection: PartialProjectionType<GroupsDto> = {
    cn: 1,
    description: 1,
    mail: 1,
    member: 1,
    owner: 1,
    state: 1,
    lastBackendSync: 1,
  };

  protected static readonly searchFields: PartialProjectionType<GroupsDto> = {
    cn: 1,
    description: 1,
    mail: 1,
  };

  protected static readonly memberSearchFields = ['inetOrgPerson.cn', 'inetOrgPerson.uid', 'inetOrgPerson.mail'];

  public constructor(
    private readonly _service: GroupsService,
    private readonly backends: BackendsService,
  ) {
    super();
  }

  @Post()
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.CREATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiCreateDecorator(GroupsCreateDto, GroupsDto)
  public async create(@Res() res: Response, @Body() body: GroupsCreateDto): Promise<Response> {
    const data = await this._service.create(body);
    return res.status(HttpStatus.CREATED).json({
      statusCode: HttpStatus.CREATED,
      data,
    });
  }

  @Get()
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiPaginatedDecorator(PickProjectionHelper(GroupsDto, GroupsController.projection))
  public async search(
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
    @Query('search') search: string,
  ): Promise<Response> {
    const searchFilter = {};

    if (search && search.trim().length > 0) {
      searchFilter['$or'] = Object.keys(GroupsController.searchFields).map((key) => {
        return { [key]: { $regex: `^${search}`, $options: 'i' } };
      });
    }

    const [data, total] = await this._service.findAndCount(
      { ...searchFilter, ...searchFilterSchema },
      GroupsController.projection,
      searchFilterOptions,
    );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    });
  }

  @Post('sync')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Synchronise une liste de groupes vers les backends' })
  public async sync(
    @Res() res: Response,
    @Body() body: GroupsSyncDto,
    @Query('async') asyncQuery: string,
  ): Promise<Response> {
    const async = /true|on|yes|1/i.test(asyncQuery);
    const data = await this.backends.syncGroups(body.ids, { async });
    return res.status(HttpStatus.ACCEPTED).json({ async, data });
  }

  @Get('memberof/:identityId([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: 'identityId', type: String })
  @ApiOperation({ summary: "Liste les groupes dont l'identité est membre (memberOf)" })
  public async memberOf(
    @Param('identityId', ObjectIdValidationPipe) identityId: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.findMemberOf(identityId);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Put('memberof/:identityId([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: 'identityId', type: String })
  @ApiOperation({ summary: "Remplace la liste des groupes de l'identité" })
  public async setMemberOf(
    @Param('identityId', ObjectIdValidationPipe) identityId: Types.ObjectId,
    @Body() body: GroupsMemberOfDto,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.setIdentityGroups(identityId, body.groups);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Get(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiReadResponseDecorator(GroupsDto)
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
    resource: '/management/groups',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiUpdateDecorator(GroupsUpdateDto, GroupsDto)
  public async update(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: GroupsUpdateDto,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.updateGroup(_id, body);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Delete(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.DELETE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiDeletedResponseDecorator(GroupsDto)
  public async remove(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this.backends.deleteGroups([_id.toHexString()]);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Get(':_id([0-9a-fA-F]{24})/members')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiOperation({ summary: 'Liste paginée des membres du groupe' })
  public async members(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
    @Query('search') search: string,
  ): Promise<Response> {
    const searchFilter = {};

    if (search && search.trim().length > 0) {
      searchFilter['$or'] = GroupsController.memberSearchFields.map((key) => {
        return { [key]: { $regex: `^${search}`, $options: 'i' } };
      });
    }

    const [data, total] = await this._service.findMembers(
      _id,
      { ...searchFilter, ...searchFilterSchema },
      searchFilterOptions,
    );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    });
  }

  @Post(':_id([0-9a-fA-F]{24})/members')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiOperation({ summary: 'Ajoute des membres au groupe' })
  public async addMembers(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: GroupsMembersDto,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.addMembers(_id, body.members);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Delete(':_id([0-9a-fA-F]{24})/members')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiOperation({ summary: 'Retire des membres du groupe' })
  public async removeMembers(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: GroupsMembersDto,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.removeMembers(_id, body.members);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }
}
