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
import { normalizeMongoFilterValues } from '~/_common/functions/normalize-mongo-filter-values';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service';
import { GroupsCreateDto, GroupsUpdateDto } from './_dto/groups.dto';
import { GroupFamilies } from './_schemas/group-families.schema';
import { Groups } from './_schemas/groups.schema';

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
    const member = await this.normalizeMembers(data.member);
    const owner = await this.normalizeMembers(data.owner);
    const family = await this.normalizeFamily(data.family);

    return await super.create<T>({ ...data, family, member, owner, state: IdentityState.TO_SYNC }, options);
  }

  public async updateGroup(_id: Types.ObjectId, data: GroupsUpdateDto): Promise<ModifyResult<Query<Groups, Groups>>> {
    const $set: Record<string, unknown> = { ...data, state: IdentityState.TO_SYNC };
    if (data.cn !== undefined) await this.ensureCnAvailable(data.cn, _id);
    if (data.mail !== undefined) await this.ensureMailAvailable(data.mail, _id);
    if (data.member !== undefined) $set.member = await this.normalizeMembers(data.member);
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
    const members = await this.normalizeMembers(ids);
    return await this.update<Groups>(_id, {
      $addToSet: { member: { $each: members } },
      $set: { state: IdentityState.TO_SYNC },
    });
  }

  public async removeMembers(_id: Types.ObjectId, ids: string[]): Promise<ModifyResult<Query<Groups, Groups>>> {
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
      .find({ member: identityId }, { cn: 1, description: 1, state: 1 })
      .sort({ cn: 1 })
      .lean<Groups[]>()
      .exec();
  }

  /**
   * Remplace la liste des groupes d'une identité en ne modifiant que les groupes concernés par la différence
   */
  public async setIdentityGroups(identityId: Types.ObjectId, groupIds: string[]): Promise<Groups[]> {
    await this.normalizeMembers([identityId.toHexString()]);

    const target = new Set(groupIds);
    const current = new Set((await this.findMemberOf(identityId)).map((group) => group._id.toHexString()));
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
