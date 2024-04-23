import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Keyrings } from '~/core/keyrings/_schemas/keyrings.schema';
import { Model, SaveOptions, Document } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { KeyringsCreateDto } from './_dto/keyrings.dto';
import { randomBytes } from 'node:crypto';

@Injectable()
export class KeyringsService extends AbstractServiceSchema {
  constructor(@InjectModel(Keyrings.name) protected _model: Model<Keyrings>) {
    super();
  }

  public async create<T extends Keyrings | Document>(
    data?: KeyringsCreateDto,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    const token = randomBytes(64).toString('hex');
    return await super.create(
      {
        ...data,
        token,
      },
      options,
    );
  }
}
