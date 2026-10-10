import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FilterOptions, FilterSchema, SearchFilterOptions } from '@tacxou/nestjs_module_restools/search-filter-schema';
import { SearchFilterSchema } from '~/_common/decorators/search-filter-schema.decorator';
import { Response } from 'express';
import { FilterQuery, Types } from 'mongoose';
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
  GroupsIdsDto,
  GroupsFiltersPreviewDto,
  GroupsMemberOfDto,
  GroupsMembersDto,
  GroupsSyncDto,
  GroupsUpdateDto,
} from './_dto/groups.dto';
import { GroupsService } from './groups.service';
import { Groups, GroupType } from './_schemas/groups.schema';
import { IdentityState } from '~/management/identities/_enums/states.enum';

@ApiTags('management/groups')
@Controller('groups')
export class GroupsController extends AbstractController {
  protected static readonly projection: PartialProjectionType<GroupsDto> = {
    cn: 1,
    description: 1,
    mail: 1,
    family: 1,
    type: 1,
    attribute: 1,
    supergroup: 1,
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
    if (body.type === GroupType.SUPER) await this.refreshSupergroup((data as unknown as Groups)._id);
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
    @Query('types') types: string | string[],
  ): Promise<Response> {
    const $and: FilterQuery<Groups>[] = [];

    if (search && search.trim().length > 0) {
      $and.push({
        $or: Object.keys(GroupsController.searchFields).map((key) => {
          return { [key]: { $regex: `^${search}`, $options: 'i' } };
        }),
      });
    }
    const typesFilter = this.buildTypesFilter(types);
    if (typesFilter) $and.push(typesFilter);

    const [data, total] = await this._service.search(
      { ...($and.length ? { $and } : {}), ...searchFilterSchema },
      GroupsController.projection,
      searchFilterOptions,
    );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    });
  }

  @Get('count-to-sync')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Nombre de groupes à synchroniser (état TO_SYNC)' })
  public async countToSync(@Res() res: Response): Promise<Response> {
    const data = await this._service.model.countDocuments({ state: IdentityState.TO_SYNC }).exec();
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Post('preview-members')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: "Nombre d'identités sélectionnées par le filtre d'un groupe dynamique" })
  public async previewMembers(@Res() res: Response, @Body() body: GroupsFiltersPreviewDto): Promise<Response> {
    const total = await this._service.countDynamicMembers(body.filters);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: { total },
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

  @Post('to-sync')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: "Passe une liste de groupes à l'état « à synchroniser »" })
  public async markToSync(@Res() res: Response, @Body() body: GroupsIdsDto): Promise<Response> {
    const data = await this._service.markToSync(body.ids);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Post('delete')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.DELETE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Supprime une liste de groupes (job GROUP_DELETE pour les groupes déjà synchronisés)' })
  public async removeMany(@Res() res: Response, @Body() body: GroupsIdsDto): Promise<Response> {
    const managed = new Set(await this._service.findManagedChildren(body.ids));
    const ids = body.ids.filter((id) => !managed.has(id));
    // en arrière-plan : la suppression attendrait sinon le daemon pour chaque groupe
    const data = ids.length ? await this.backends.deleteGroups(ids, { async: true }) : {};
    for (const id of managed) {
      data[id] = { error: 'Groupe géré par un supergroupe : supprimez ou modifiez le supergroupe' };
    }
    return res.status(HttpStatus.ACCEPTED).json({ async: true, data });
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
    if (body.attribute !== undefined || body.family !== undefined) {
      const group = await this._service.findById<Groups>(_id, { type: 1 });
      if (group.type === GroupType.SUPER) await this.refreshSupergroup(_id);
    }
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
    if ((await this._service.findManagedChildren([_id.toHexString()])).length) {
      throw new BadRequestException('Ce groupe est géré par un supergroupe : supprimez ou modifiez le supergroupe');
    }
    const data = await this.backends.deleteGroups([_id.toHexString()]);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Get(':_id([0-9a-fA-F]{24})/children')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiOperation({ summary: 'Liste paginée des groupes rattachés à un supergroupe' })
  public async children(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
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

    const [data, total] = await this._service.findChildren(
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

  @Post(':_id([0-9a-fA-F]{24})/refresh')
  @UseRoles({
    resource: '/management/groups',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiOperation({ summary: 'Recalcule les groupes rattachés à un supergroupe et les synchronise' })
  public async refresh(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this.refreshSupergroup(_id, true);
    return res.status(HttpStatus.ACCEPTED).json({ async: true, data });
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

  /**
   * Recalcule un supergroupe : les groupes dont la valeur a disparu sont supprimés,
   * les groupes créés/modifiés restent à TO_SYNC ou sont synchronisés immédiatement si `sync`
   */
  protected async refreshSupergroup(
    _id: Types.ObjectId,
    sync = false,
  ): Promise<{ changed: string[]; removed: string[] }> {
    const result = await this._service.refreshSupergroup(_id);
    if (result.removed.length) await this.backends.deleteGroups(result.removed, { async: true });
    if (sync && result.changed.length) await this.backends.syncGroups(result.changed, { async: true });
    return result;
  }

  /**
   * Filtre de la liste par type de groupe (`types=static,dynamic,super,child`) ;
   * `child` désigne les groupes générés par un supergroupe, `static` les groupes normaux non générés
   */
  protected buildTypesFilter(types?: string | string[]): FilterQuery<Groups> | null {
    const conditions: Record<string, FilterQuery<Groups>> = {
      static: { type: { $nin: [GroupType.DYNAMIC, GroupType.SUPER] }, supergroup: null },
      dynamic: { type: GroupType.DYNAMIC },
      super: { type: GroupType.SUPER },
      child: { supergroup: { $ne: null } },
    };
    const selected = [
      ...new Set(
        (Array.isArray(types) ? types : [types])
          .flatMap((value) => `${value || ''}`.split(','))
          .map((value) => value.trim())
          .filter((value) => conditions[value]),
      ),
    ];
    if (!selected.length || selected.length === Object.keys(conditions).length) return null;

    return { $or: selected.map((value) => conditions[value]) };
  }
}
