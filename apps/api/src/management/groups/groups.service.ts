import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import {
  Document,
  FilterQuery,
  Model,
  ModifyResult,
  PipelineStage,
  ProjectionType,
  Query,
  QueryOptions,
  SaveOptions,
  Types,
} from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import {
  extractFilterGroups,
  FilterGroup,
  FilterGroups,
  filterSchemaWithGroups,
} from '~/_common/functions/filter-schema-groups.function';
import { normalizeMongoFilterValues } from '~/_common/functions/normalize-mongo-filter-values';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service';
import { GroupsCreateDto, GroupsUpdateDto } from './_dto/groups.dto';
import { GroupFamilies } from './_schemas/group-families.schema';
import { Groups, GroupType } from './_schemas/groups.schema';

/**
 * Service de gestion des groupes d'identités (type LDAP `groupOfNames`).
 * Toute modification d'un groupe le repasse à l'état TO_SYNC pour propagation vers les backends.
 */
@Injectable()
export class GroupsService extends AbstractServiceSchema<Groups> {
  public static readonly memberProjection = {
    'inetOrgPerson.cn': 1,
    'inetOrgPerson.uid': 1,
    'inetOrgPerson.mail': 1,
    'inetOrgPerson.employeeNumber': 1,
    'inetOrgPerson.employeeType': 1,
    state: 1,
    deletedFlag: 1,
  };

  public constructor(
    @InjectModel(Groups.name) protected _model: Model<Groups>,
    @InjectModel(GroupFamilies.name) protected readonly familiesModel: Model<GroupFamilies>,
    protected readonly identities: IdentitiesCrudService,
  ) {
    super();
  }

  public async create<T extends AbstractSchema | Document>(
    data?: GroupsCreateDto,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    await this.ensureCnAvailable(data.cn);
    await this.ensureMailAvailable(data.mail);
    const owner = await this.normalizeMembers(data.owner);
    const family = await this.normalizeFamily(data.family);
    const membership =
      data.type === GroupType.DYNAMIC
        ? await this.buildDynamicMembership(data.filters)
        : { type: GroupType.STATIC, filters: null, member: await this.normalizeMembers(data.member) };

    return await super.create<T>({ ...data, family, owner, ...membership, state: IdentityState.TO_SYNC }, options);
  }

  public async updateGroup(_id: Types.ObjectId, data: GroupsUpdateDto): Promise<ModifyResult<Query<Groups, Groups>>> {
    const $set: Record<string, unknown> = { ...data, state: IdentityState.TO_SYNC };
    if (data.cn !== undefined) await this.ensureCnAvailable(data.cn, _id);
    if (data.mail !== undefined) await this.ensureMailAvailable(data.mail, _id);
    if (data.type !== undefined || data.filters !== undefined || data.member !== undefined) {
      const current = await this.findById<Groups>(_id, { type: 1, filters: 1 });
      const type = data.type ?? current.type ?? GroupType.STATIC;
      if (type === GroupType.DYNAMIC) {
        // les membres d'un groupe dynamique sont toujours recalculés à partir du filtre
        Object.assign(
          $set,
          await this.buildDynamicMembership(data.filters !== undefined ? data.filters : current.filters),
        );
      } else {
        // un groupe redevenu normal conserve ses derniers membres calculés
        $set.type = GroupType.STATIC;
        $set.filters = null;
        if (data.member !== undefined) $set.member = await this.normalizeMembers(data.member);
        else delete $set.member;
      }
    }
    if (data.owner !== undefined) $set.owner = await this.normalizeMembers(data.owner);
    if (data.family !== undefined) $set.family = await this.normalizeFamily(data.family);

    return await this.update<Groups>(_id, { $set });
  }

  /**
   * Recherche paginée des groupes ; le tri sur `family` porte sur le nom de la famille et non sur son identifiant
   */
  public async search(
    filter: FilterQuery<Groups>,
    projection: ProjectionType<Groups>,
    options: QueryOptions<Groups>,
  ): Promise<[unknown[], number]> {
    const sort = (options?.sort || {}) as Record<string, 1 | -1>;
    if (!Object.keys(sort).includes('family')) {
      return await this.findAndCount(filter, projection, options);
    }

    const normalized = normalizeMongoFilterValues({ ...filter, deletedFlag: { $ne: true } });
    // l'agrégation ne caste pas le filtre (ObjectId, dates...) contrairement à find()
    const match = this._model.find().cast(this._model, normalized);
    const $sort = Object.fromEntries(
      Object.entries(sort).map(([key, dir]) => [key === 'family' ? '_familyName' : key, dir]),
    ) as Record<string, 1 | -1>;

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: { from: this.familiesModel.collection.name, localField: 'family', foreignField: '_id', as: '_family' },
      },
      { $addFields: { _familyName: { $first: '$_family.name' } } },
      { $sort: { ...$sort, _id: 1 } },
      { $skip: options?.skip || 0 },
    ];
    if (options?.limit) pipeline.push({ $limit: options.limit });
    pipeline.push({ $project: projection as Record<string, 1> });

    return await Promise.all([
      this._model.aggregate(pipeline).collation({ locale: 'fr' }).exec(),
      this._model.countDocuments(normalized).exec(),
    ]);
  }

  public async addMembers(_id: Types.ObjectId, ids: string[]): Promise<ModifyResult<Query<Groups, Groups>>> {
    await this.ensureStaticGroup(_id);
    const members = await this.normalizeMembers(ids);
    return await this.update<Groups>(_id, {
      $addToSet: { member: { $each: members } },
      $set: { state: IdentityState.TO_SYNC },
    });
  }

  public async removeMembers(_id: Types.ObjectId, ids: string[]): Promise<ModifyResult<Query<Groups, Groups>>> {
    await this.ensureStaticGroup(_id);
    return await this.update<Groups>(_id, {
      $pull: { member: { $in: ids.map((id) => new Types.ObjectId(id)) } },
      $set: { state: IdentityState.TO_SYNC },
    });
  }

  /**
   * Retourne les membres d'un groupe (identités peuplées), paginés
   */
  public async findMembers(
    _id: Types.ObjectId,
    filter: FilterQuery<unknown> = {},
    options?: QueryOptions,
  ): Promise<[unknown[], number]> {
    const group = await this.findById<Groups>(_id, { member: 1 });
    const memberFilter = { ...filter, _id: { $in: group.member || [] } };

    return await Promise.all([
      this.identities.model.find(memberFilter, GroupsService.memberProjection, options).lean().exec(),
      this.identities.model.countDocuments(memberFilter).exec(),
    ]);
  }

  /**
   * Équivalent de l'attribut opérationnel LDAP `memberOf`
   */
  public async findMemberOf(identityId: Types.ObjectId): Promise<Groups[]> {
    return await this._model
      .find({ member: identityId }, { cn: 1, description: 1, state: 1, type: 1 })
      .sort({ cn: 1 })
      .lean<Groups[]>()
      .exec();
  }

  /**
   * Remplace la liste des groupes d'une identité en ne modifiant que les groupes concernés par la différence.
   * Les groupes dynamiques sont ignorés : leur appartenance ne dépend que de leur filtre.
   */
  public async setIdentityGroups(identityId: Types.ObjectId, groupIds: string[]): Promise<Groups[]> {
    await this.normalizeMembers([identityId.toHexString()]);

    const dynamicIds = new Set(
      (await this._model.find({ type: GroupType.DYNAMIC }, { _id: 1 }).lean().exec()).map((group) =>
        group._id.toHexString(),
      ),
    );
    const target = new Set(groupIds.filter((id) => !dynamicIds.has(id)));
    const current = new Set(
      (await this.findMemberOf(identityId)).map((group) => group._id.toHexString()).filter((id) => !dynamicIds.has(id)),
    );
    const toAdd = [...target].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !target.has(id));

    if (toAdd.length > 0) {
      const existing = await this._model.countDocuments({ _id: { $in: toAdd } }).exec();
      if (existing !== toAdd.length) throw new BadRequestException('Un ou plusieurs groupes sont introuvables');
    }

    for (const id of toAdd) {
      await this.update<Groups>(new Types.ObjectId(id), {
        $addToSet: { member: identityId },
        $set: { state: IdentityState.TO_SYNC },
      });
    }
    for (const id of toRemove) {
      await this.update<Groups>(new Types.ObjectId(id), {
        $pull: { member: identityId },
        $set: { state: IdentityState.TO_SYNC },
      });
    }

    return await this.findMemberOf(identityId);
  }

  /**
   * Réévalue le filtre de chaque groupe dynamique et met à jour ses membres s'ils ont changé.
   * Les groupes modifiés repassent à TO_SYNC ; leurs identifiants sont retournés pour synchronisation.
   */
  public async refreshDynamicGroups(): Promise<string[]> {
    const groups = await this._model
      .find({ type: GroupType.DYNAMIC, deletedFlag: { $ne: true } }, { cn: 1, filters: 1, member: 1 })
      .lean<Groups[]>()
      .exec();
    const changed: string[] = [];

    for (const group of groups) {
      let member: Types.ObjectId[];
      try {
        member = await this.resolveDynamicMembers(group.filters);
      } catch (error) {
        this.logger.error(`Filtre invalide pour le groupe dynamique <${group.cn}>: ${error?.message || error}`);
        continue;
      }

      const before = (group.member || []).map((id) => id.toString()).sort();
      const after = member.map((id) => id.toString()).sort();
      if (before.length === after.length && before.every((id, index) => id === after[index])) continue;

      await this.update<Groups>(group._id, { $set: { member, state: IdentityState.TO_SYNC } });
      changed.push(group._id.toString());
    }

    return changed;
  }

  /**
   * Passe les groupes donnés à l'état TO_SYNC (action « Mettre à synchroniser » de la liste)
   */
  public async markToSync(ids: string[]): Promise<{ matched: number; modified: number }> {
    const result = await this._model
      .updateMany({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } }, { $set: { state: IdentityState.TO_SYNC } })
      .exec();
    return { matched: result.matchedCount, modified: result.modifiedCount };
  }

  /**
   * Repasse à TO_SYNC les groupes contenant les identités données (suppression/restauration d'une identité)
   */
  public async markGroupsOfIdentitiesToSync(identityIds: (string | Types.ObjectId)[]): Promise<void> {
    const ids = identityIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (!ids.length) return;
    await this._model.updateMany({ member: { $in: ids } }, { $set: { state: IdentityState.TO_SYNC } }).exec();
  }

  /**
   * Suppression définitive d'une identité : elle est retirée de tous les groupes
   */
  @OnEvent('management.identities.service.afterDelete')
  public async onIdentityDeleted(payload: { deleted?: { _id?: Types.ObjectId } }): Promise<void> {
    const identityId = payload?.deleted?._id;
    if (!identityId) return;

    await this._model
      .updateMany({ member: identityId }, { $pull: { member: identityId }, $set: { state: IdentityState.TO_SYNC } })
      .exec();
    await this._model.updateMany({ owner: identityId }, { $pull: { owner: identityId } }).exec();
  }

  /**
   * L'adresse email doit être unique dans tout le système : groupes et identités (inetOrgPerson.mail).
   * Les identités ignorées sont les mêmes que pour le contrôle d'unicité entre identités
   * (supprimées, non synchronisées, ayant servi à une fusion).
   */
  protected async ensureMailAvailable(mail?: string | null, excludeId?: Types.ObjectId): Promise<void> {
    const normalized = `${mail || ''}`.trim().toLowerCase();
    if (!normalized) return;

    const groupFilter: FilterQuery<Groups> = { mail: normalized };
    if (excludeId) groupFilter._id = { $ne: excludeId };
    if (await this._model.exists(groupFilter).exec()) {
      throw new ConflictException(`L'adresse email <${normalized}> est déjà utilisée par un autre groupe`);
    }

    const escapedMail = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const usedByIdentity = await this.identities.model
      .exists({
        state: { $ne: IdentityState.DONT_SYNC },
        deletedFlag: { $ne: true },
        destFusionId: { $eq: null },
        // comparaison insensible à la casse : les emails des identités ne sont pas normalisés
        'inetOrgPerson.mail': { $regex: `^${escapedMail}$`, $options: 'i' },
      })
      .exec();
    if (usedByIdentity) {
      throw new ConflictException(`L'adresse email <${normalized}> est déjà utilisée par une identité`);
    }
  }

  protected async ensureStaticGroup(_id: Types.ObjectId): Promise<void> {
    const group = await this.findById<Groups>(_id, { type: 1 });
    if (group?.type === GroupType.DYNAMIC) {
      throw new BadRequestException('Les membres d’un groupe dynamique sont calculés à partir de son filtre');
    }
  }

  protected async buildDynamicMembership(
    filters?: FilterGroups | null,
  ): Promise<{ type: GroupType; filters: FilterGroups; member: Types.ObjectId[] }> {
    let groups: FilterGroup[];
    try {
      groups = extractFilterGroups(filters) ?? (filters ? [filters as FilterGroup] : []);
    } catch (error) {
      throw new BadRequestException(error?.message ?? 'Filtre de groupe dynamique invalide');
    }
    groups = groups.filter((group) => Object.keys(group).length > 0);
    if (!groups.length) {
      throw new BadRequestException('Un groupe dynamique doit avoir au moins un filtre');
    }

    // un seul groupe ET est stocké sous sa forme objet historique, plusieurs groupes OU sous forme de liste
    const normalized: FilterGroups = groups.length === 1 ? groups[0] : groups;
    return { type: GroupType.DYNAMIC, filters: normalized, member: await this.resolveDynamicMembers(normalized) };
  }

  public async countDynamicMembers(filters?: FilterGroups | null): Promise<number> {
    return await this.identities.model.countDocuments(this.buildDynamicFilter(filters)).exec();
  }

  /**
   * Évalue un filtre de groupe dynamique (même format et même périmètre que /identities/count-all)
   * et retourne les identifiants des identités sélectionnées, triés
   */
  protected async resolveDynamicMembers(filters?: FilterGroups | null): Promise<Types.ObjectId[]> {
    const found = await this.identities.model
      .find(this.buildDynamicFilter(filters), { _id: 1 })
      .sort({ _id: 1 })
      .lean()
      .exec();

    return found.map((identity) => new Types.ObjectId(identity._id.toString()));
  }

  /**
   * Convertit le filtre stocké (clés signées) en filtre Mongo sur les identités non supprimées
   */
  protected buildDynamicFilter(filters?: FilterGroups | null): FilterQuery<unknown> {
    let filter: FilterQuery<unknown>;
    try {
      filter = filterSchemaWithGroups(filters || {});
    } catch (error) {
      throw new BadRequestException(error?.message ?? 'Filtre de groupe dynamique invalide');
    }
    return normalizeMongoFilterValues({ ...filter, deletedFlag: { $ne: true } });
  }

  protected async ensureCnAvailable(cn: string, excludeId?: Types.ObjectId): Promise<void> {
    const filter: FilterQuery<Groups> = { cn: cn?.trim() };
    if (excludeId) filter._id = { $ne: excludeId };
    if (await this._model.exists(filter).exec()) {
      throw new ConflictException(`Le groupe <${cn}> existe déjà`);
    }
  }

  /**
   * Vérifie que la famille existe ; null/vide retire le groupe de sa famille
   */
  protected async normalizeFamily(id?: string | null): Promise<Types.ObjectId | null> {
    if (!id) return null;
    if (!(await this.familiesModel.exists({ _id: id }).exec())) {
      throw new BadRequestException('La famille de groupes est introuvable');
    }
    return new Types.ObjectId(id);
  }

  /**
   * Dédoublonne la liste et vérifie que chaque identité existe et n'est pas supprimée
   */
  protected async normalizeMembers(ids?: string[]): Promise<Types.ObjectId[]> {
    if (!ids?.length) return [];

    const unique = [...new Set(ids.map((id) => id.toString()))];
    const found = await this.identities.model
      .find({ _id: { $in: unique }, deletedFlag: { $ne: true } }, { _id: 1 })
      .lean()
      .exec();

    if (found.length !== unique.length) {
      const foundIds = new Set(found.map((identity) => identity._id.toString()));
      const missing = unique.filter((id) => !foundIds.has(id));
      throw new BadRequestException({
        message: 'Une ou plusieurs identités sont introuvables ou supprimées',
        missing,
      });
    }

    return unique.map((id) => new Types.ObjectId(id));
  }
}
