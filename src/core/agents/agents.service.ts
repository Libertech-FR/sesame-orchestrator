import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Agents } from '~/core/agents/_schemas/agents.schema';
import { Document, Model, ModifyResult, Query, QueryOptions, SaveOptions, Types, UpdateQuery } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { AgentsCreateDto } from './_dto/agents.dto';
import { hash } from 'argon2';
import { randomBytes } from 'node:crypto';
import { SecurityPartDTO } from './_dto/parts/security.part.dto';

@Injectable()
export class AgentsService extends AbstractServiceSchema {
  constructor(@InjectModel(Agents.name) protected _model: Model<Agents>) {
    super();
  }

  public async create<T extends Agents | Document>(
    data?: AgentsCreateDto,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    data.password = await hash(data.password);
    data.security = (data.security || {}) as SecurityPartDTO;
    data.security.secretKey = randomBytes(32).toString('hex');
    return await super.create(data, options);
  }

  public async update<T extends Agents | Document>(
    _id: Types.ObjectId | any,
    update: UpdateQuery<T> & any,
    options?: QueryOptions<T>,
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    if (update.password) {
      update.password = await hash(update.password);
    }
    if (update.$set?.password) {
      update.$set.password = await hash(update.$set.password);
    }
    return await super.update(
      _id,
      {
        ...update,
        $set: {
          ...(update?.$set || {}),
        },
      },
      options,
    );
  }
}
