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

  /**
   * Groupes dont l'appartenance n'est pas modifiable à la main
   */
  public static readonly computedMembershipFilter: FilterQuery<Groups> = {
    $or: [{ type: { $in: [GroupType.DYNAMIC, GroupType.SUPER] } }, { supergroup: { $ne: null } }],
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
    if (data.type === GroupType.SUPER) {
      // un supergroupe ne porte pas de membres et n'est jamais synchronisé : ses groupes enfants le sont
      return await super.create<T>(
        {
          ...data,
          family,
          owner,
          attribute: this.normalizeAttribute(data.attribute),
          filters: null,
          member: [],
          state: IdentityState.DONT_SYNC,
        },
        options,
      );
    }
    const membership =
      data.type === GroupType.DYNAMIC
        ? await this.buildDynamicMembership(data.filters)
        : { type: GroupType.STATIC, filters: null, member: await this.normalizeGroupMembers(data.member) };

    return await super.create<T>(
      { ...data, attribute: null, family, owner, ...membership, state: IdentityState.TO_SYNC },
      options,
    );
  }

  public async updateGroup(_id: Types.ObjectId, data: GroupsUpdateDto): Promise<ModifyResult<Query<Groups, Groups>>> {
    const $set: Record<string, unknown> = { ...data, state: IdentityState.TO_SYNC };
    if (data.cn !== undefined) await this.ensureCnAvailable(data.cn, _id);
    if (data.mail !== undefined) await this.ensureMailAvailable(data.mail, _id);
    const current = await this.findById<Groups>(_id, { type: 1, filters: 1, supergroup: 1 });
    if (data.type !== undefined && (data.type === GroupType.SUPER) !== (current.type === GroupType.SUPER)) {
      throw new BadRequestException('Un groupe ne peut pas être transformé en supergroupe, ni l’inverse');
    }

    if (current.type === GroupType.SUPER) {
      // seuls les champs descriptifs et l'attribut sont modifiables ; les enfants sont recalculés par refreshSupergroup
      delete $set.type;
      delete $set.filters;
      delete $set.member;
      $set.state = IdentityState.DONT_SYNC;
      if (data.attribute !== undefined) $set.attribute = this.normalizeAttribute(data.attribute);
    } else if (current.supergroup) {
      if (['cn', 'type', 'filters', 'member', 'attribute', 'family'].some((key) => data[key] !== undefined)) {
        throw new BadRequestException(
          'Ce groupe est géré par un supergroupe : son nom, sa famille et ses membres sont calculés',
        );
      }
    } else if (data.type !== undefined || data.filters !== undefined || data.member !== undefined) {
      delete $set.attribute;
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
        if (data.member !== undefined) $set.member = await this.normalizeGroupMembers(data.member);
        else delete $set.member;
      }
    }
    if (current.type !== GroupType.SUPER) delete $set.attribute;
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
    const members = await this.normalizeGroupMembers(ids);
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
      .find({ member: identityId }, { cn: 1, description: 1, state: 1, type: 1, supergroup: 1 })
      .sort({ cn: 1 })
      .lean<Groups[]>()
      .exec();
  }

  /**
   * Remplace la liste des groupes d'une identité en ne modifiant que les groupes concernés par la différence.
   * Les groupes dynamiques et ceux gérés par un supergroupe sont ignorés : leur appartenance est calculée.
   */
  public async setIdentityGroups(identityId: Types.ObjectId, groupIds: string[]): Promise<Groups[]> {
    await this.normalizeMembers([identityId.toHexString()]);

    // groupes dont l'appartenance est calculée : dynamiques, supergroupes et groupes générés par un supergroupe
    const dynamicIds = new Set(
      (await this._model.find(GroupsService.computedMembershipFilter, { _id: 1 }).lean().exec()).map((group) =>
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
      await this.normalizeGroupMembers([identityId.toHexString()]);
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
      .updateMany(
        { _id: { $in: ids.map((id) => new Types.ObjectId(id)) }, type: { $ne: GroupType.SUPER } },
        { $set: { state: IdentityState.TO_SYNC } },
      )
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

    await this.removeMemberFromAllGroups(identityId);
    await this._model.updateMany({ owner: identityId }, { $pull: { owner: identityId } }).exec();
  }

  /**
   * Une identité passée à DONT_SYNC (ex: fusion) est retirée de tous les groupes dont elle était membre
   */
  @OnEvent('management.identities.service.afterUpdate')
  public async onIdentityUpdated(payload: {
    updated?: { _id?: Types.ObjectId; state?: IdentityState };
  }): Promise<void> {
    await this.removeDontSyncMember(payload?.updated);
  }

  @OnEvent('management.identities.service.afterUpsert')
  public async onIdentityUpserted(payload: {
    result?: { _id?: Types.ObjectId; state?: IdentityState };
  }): Promise<void> {
    await this.removeDontSyncMember(payload?.result);
  }

  protected async removeDontSyncMember(identity?: { _id?: Types.ObjectId; state?: IdentityState }): Promise<void> {
    if (!identity?._id || identity.state !== IdentityState.DONT_SYNC) return;
    await this.removeMemberFromAllGroups(new Types.ObjectId(identity._id.toString()));
  }

  /**
   * Retire l'identité de tous ses groupes ; les groupes dynamiques et de supergroupe le seraient aussi au prochain recalcul
   */
  protected async removeMemberFromAllGroups(identityId: Types.ObjectId): Promise<void> {
    await this._model
      .updateMany({ member: identityId }, { $pull: { member: identityId }, $set: { state: IdentityState.TO_SYNC } })
      .exec();
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
    const group = await this.findById<Groups>(_id, { type: 1, supergroup: 1 });
    if (group?.type === GroupType.DYNAMIC) {
      throw new BadRequestException('Les membres d’un groupe dynamique sont calculés à partir de son filtre');
    }
    if (group?.type === GroupType.SUPER) {
      throw new BadRequestException('Un supergroupe n’a pas de membres : ils sont portés par ses groupes rattachés');
    }
    if (group?.supergroup) {
      throw new BadRequestException('Les membres d’un groupe géré par un supergroupe sont calculés');
    }
  }

  protected normalizeAttribute(attribute?: string | null): string {
    const normalized = `${attribute || ''}`.trim();
    if (!normalized) throw new BadRequestException('Un supergroupe doit avoir un attribut');
    return normalized;
  }

  /**
   * Identifiants des groupes générés par un supergroupe dont le supergroupe existe toujours
   * (ils ne peuvent pas être supprimés à la main, ils seraient recréés au prochain recalcul)
   */
  public async findManagedChildren(ids: string[]): Promise<string[]> {
    const groups = await this._model
      .find(
        { _id: { $in: ids.filter((id) => Types.ObjectId.isValid(id)) }, supergroup: { $ne: null } },
        { supergroup: 1 },
      )
      .lean<Groups[]>()
      .exec();
    const parents = new Set(
      (
        await this._model
          .find({ _id: { $in: groups.map((group) => group.supergroup) }, type: GroupType.SUPER }, { _id: 1 })
          .lean()
          .exec()
      ).map((group) => group._id.toString()),
    );

    return groups.filter((group) => parents.has(group.supergroup.toString())).map((group) => group._id.toString());
  }

  /**
   * Identifiants des groupes générés par le supergroupe
   */
  public async findChildrenIds(supergroupId: Types.ObjectId | string): Promise<string[]> {
    const children = await this._model
      .find({ supergroup: new Types.ObjectId(supergroupId) }, { _id: 1 })
      .lean()
      .exec();
    return children.map((group) => group._id.toString());
  }

  /**
   * Groupes rattachés à un supergroupe, paginés, avec leur nombre de membres
   */
  public async findChildren(
    supergroupId: Types.ObjectId,
    filter: FilterQuery<Groups> = {},
    options?: QueryOptions<Groups>,
  ): Promise<[unknown[], number]> {
    const match = this._model
      .find()
      .cast(this._model, normalizeMongoFilterValues({ ...filter, supergroup: supergroupId }));
    const sort = (options?.sort || { cn: 1 }) as Record<string, 1 | -1>;

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $sort: { ...sort, _id: 1 } },
      { $skip: options?.skip || 0 },
    ];
    if (options?.limit) pipeline.push({ $limit: options.limit });
    pipeline.push({
      $project: { cn: 1, description: 1, family: 1, state: 1, lastBackendSync: 1, memberCount: { $size: '$member' } },
    });

    return await Promise.all([
      this._model.aggregate(pipeline).collation({ locale: 'fr' }).exec(),
      this._model.countDocuments(match).exec(),
    ]);
  }

  /**
   * Recalcule les groupes d'un supergroupe : un groupe statique par valeur distincte de son attribut
   * (un attribut multivalué place l'identité dans plusieurs groupes).
   * Retourne les groupes créés/modifiés (passés à TO_SYNC) et ceux dont la valeur a disparu, à supprimer.
   */
  public async refreshSupergroup(
    supergroupId: Types.ObjectId | string,
  ): Promise<{ changed: string[]; removed: string[] }> {
    const supergroup = await this.findById<Groups>(supergroupId, { cn: 1, type: 1, attribute: 1, family: 1 });
    if (supergroup.type !== GroupType.SUPER) {
      throw new BadRequestException(`Le groupe <${supergroup.cn}> n'est pas un supergroupe`);
    }
    const attribute = this.normalizeAttribute(supergroup.attribute);

    const values: { _id: unknown; member: Types.ObjectId[] }[] = await this.identities.model
      .aggregate([
        {
          $match: {
            deletedFlag: { $ne: true },
            state: { $ne: IdentityState.DONT_SYNC },
            [attribute]: { $exists: true, $nin: [null, ''] },
          },
        },
        { $project: { value: `$${attribute}` } },
        { $unwind: '$value' },
        { $group: { _id: '$value', member: { $addToSet: '$_id' } } },
      ])
      .exec();

    // plusieurs valeurs peuvent donner le même cn (ex: 1 et "1")
    const membersByCn = new Map<string, Set<string>>();
    for (const { _id: value, member } of values) {
      if (value === null || value === undefined || typeof value === 'object') continue;
      const cn = `${value}`.trim();
      if (!cn) continue;
      const set = membersByCn.get(cn) ?? new Set<string>();
      member.forEach((id) => set.add(id.toString()));
      membersByCn.set(cn, set);
    }

    const children = await this._model
      .find({ supergroup: supergroup._id }, { cn: 1, member: 1, family: 1 })
      .lean<Groups[]>()
      .exec();
    const childrenByCn = new Map(children.map((child) => [child.cn, child]));
    const family = supergroup.family ?? null;
    const changed: string[] = [];

    for (const [cn, set] of membersByCn) {
      const after = [...set].sort();
      const member = after.map((id) => new Types.ObjectId(id));
      const child = childrenByCn.get(cn);

      if (child) {
        const before = (child.member || []).map((id) => id.toString()).sort();
        const sameMembers = before.length === after.length && before.every((id, index) => id === after[index]);
        const sameFamily = `${child.family ?? ''}` === `${family ?? ''}`;
        if (sameMembers && sameFamily) continue;

        await this.update<Groups>(child._id, { $set: { member, family, state: IdentityState.TO_SYNC } });
        changed.push(child._id.toString());
        continue;
      }

      if (await this._model.exists({ cn }).exec()) {
        this.logger.warn(
          `Supergroupe <${supergroup.cn}> : le groupe <${cn}> existe déjà et n'est pas rattaché, ignoré`,
        );
        continue;
      }

      const created = await super.create<Groups>({
        cn,
        type: GroupType.STATIC,
        supergroup: supergroup._id,
        family,
        filters: null,
        attribute: null,
        member,
        state: IdentityState.TO_SYNC,
      });
      changed.push(created._id.toString());
    }

    const removed = children.filter((child) => !membersByCn.has(child.cn)).map((child) => child._id.toString());
    return { changed, removed };
  }

  /**
   * Recalcule tous les supergroupes ; une erreur sur l'un n'empêche pas le traitement des autres
   */
  public async refreshSupergroups(): Promise<{ changed: string[]; removed: string[] }> {
    const supergroups = await this._model
      .find({ type: GroupType.SUPER, deletedFlag: { $ne: true } }, { cn: 1 })
      .lean<Groups[]>()
      .exec();
    const result = { changed: [] as string[], removed: [] as string[] };

    for (const supergroup of supergroups) {
      try {
        const { changed, removed } = await this.refreshSupergroup(supergroup._id);
        result.changed.push(...changed);
        result.removed.push(...removed);
      } catch (error) {
        this.logger.error(`Recalcul impossible du supergroupe <${supergroup.cn}>: ${error?.message || error}`);
      }
    }

    return result;
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
   * Convertit le filtre stocké (clés signées) en filtre Mongo sur les identités non supprimées et synchronisables
   */
  protected buildDynamicFilter(filters?: FilterGroups | null): FilterQuery<unknown> {
    let filter: FilterQuery<unknown>;
    try {
      filter = filterSchemaWithGroups(filters || {});
    } catch (error) {
      throw new BadRequestException(error?.message ?? 'Filtre de groupe dynamique invalide');
    }
    // les identités DONT_SYNC ne peuvent pas être membres d'un groupe ; $and pour ne pas écraser un filtre sur l'état
    return normalizeMongoFilterValues({
      ...filter,
      deletedFlag: { $ne: true },
      $and: [...((filter.$and as FilterQuery<unknown>[]) || []), { state: { $ne: IdentityState.DONT_SYNC } }],
    });
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

  /**
   * Comme normalizeMembers, en refusant en plus les identités DONT_SYNC qui ne peuvent pas être membres d'un groupe
   */
  protected async normalizeGroupMembers(ids?: string[]): Promise<Types.ObjectId[]> {
    const members = await this.normalizeMembers(ids);
    if (!members.length) return members;

    const dontSync = await this.identities.model
      .find({ _id: { $in: members }, state: IdentityState.DONT_SYNC }, { _id: 1 })
      .lean()
      .exec();
    if (dontSync.length) {
      throw new BadRequestException({
        message:
          'Une ou plusieurs identités ne sont pas synchronisables (DONT_SYNC) et ne peuvent pas être membres d’un groupe',
        dontSync: dontSync.map((identity) => identity._id.toString()),
      });
    }
    return members;
  }
}
