import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Document, FilterQuery, Model, ModifyResult, Query, SaveOptions, Types } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { Groups } from './_schemas/groups.schema';
import { GroupFamiliesCreateDto, GroupFamiliesUpdateDto } from './_dto/group-families.dto';
import { GroupFamilies } from './_schemas/group-families.schema';

/**
 * Service de gestion des familles de groupes
 */
@Injectable()
export class GroupFamiliesService extends AbstractServiceSchema<GroupFamilies> {
  public constructor(
    @InjectModel(GroupFamilies.name) protected _model: Model<GroupFamilies>,
    @InjectModel(Groups.name) protected readonly groupsModel: Model<Groups>,
  ) {
    super();
  }

  public async create<T extends AbstractSchema | Document>(
    data?: GroupFamiliesCreateDto,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    await this.ensureNameAvailable(data.name);
    return await super.create<T>(data, options);
  }

  public async updateFamily(
    _id: Types.ObjectId,
    data: GroupFamiliesUpdateDto,
  ): Promise<ModifyResult<Query<GroupFamilies, GroupFamilies>>> {
    if (data.name !== undefined) await this.ensureNameAvailable(data.name, _id);
    return await this.update<GroupFamilies>(_id, { $set: data });
  }

  /**
   * Une famille encore utilisée par des groupes ne peut pas être supprimée
   */
  public async removeFamily(_id: Types.ObjectId): Promise<Query<GroupFamilies, GroupFamilies>> {
    const used = await this.groupsModel.countDocuments({ family: _id }).exec();
    if (used > 0) {
      throw new ConflictException(`Cette famille est utilisée par ${used} groupe(s)`);
    }
    return await this.delete<GroupFamilies>(_id);
  }

  public async countGroupsByFamily(): Promise<Record<string, number>> {
    const counts = await this.groupsModel
      .aggregate<{
        _id: Types.ObjectId;
        count: number;
      }>([{ $match: { family: { $ne: null } } }, { $group: { _id: '$family', count: { $sum: 1 } } }])
      .exec();
    return Object.fromEntries(counts.map((c) => [`${c._id}`, c.count]));
  }

  protected async ensureNameAvailable(name: string, excludeId?: Types.ObjectId): Promise<void> {
    const filter: FilterQuery<GroupFamilies> = { name: name?.trim() };
    if (excludeId) filter._id = { $ne: excludeId };
    if (await this._model.exists(filter).exec()) {
      throw new ConflictException(`La famille <${name}> existe déjà`);
    }
  }
}
