import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Identities } from './_schemas/identities.schema';
import { Document, Model, ModifyResult, Query, QueryOptions, SaveOptions, Types, UpdateQuery } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';

@Injectable()
export class IdentitiesService extends AbstractServiceSchema {
  constructor(@InjectModel(Identities.name) protected _model: Model<Identities>) {
    super();
  }

  public async create<T extends AbstractSchema | Document>(
    data?: any,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    // noinspection UnnecessaryLocalVariableJS
    const created: Document<T, any, T> = await super.create(data, options);
    //TODO: add backends service logic here
    return created;
  }

  public async update<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    update: UpdateQuery<T>,
    options?: QueryOptions<T> & { rawResult: true },
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    // noinspection UnnecessaryLocalVariableJS
    const updated = await super.update(_id, update, options);
    //TODO: add backends service logic here
    return updated;
  }

  public async delete<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<Query<T, T, any, T>> {
    // noinspection UnnecessaryLocalVariableJS
    const deleted = await super.delete(_id, options);
    //TODO: add backends service logic here
    return deleted;
  }
}
