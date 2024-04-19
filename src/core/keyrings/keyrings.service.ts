import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Keyrings } from '~/core/keyrings/_schemas/keyrings.schema';
import { Model, SaveOptions, Document } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { KeyringsCreateDto } from './_dto/keyrings.dto';

@Injectable()
export class KeyringsService extends AbstractServiceSchema {
  constructor(@InjectModel(Keyrings.name) protected _model: Model<Keyrings>) {
    super();
  }

  public async create<T extends Keyrings | Document>(
    data?: KeyringsCreateDto,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    const token = '1234567890';
    return await super.create(
      {
        ...data,
        token,
      },
      options,
    );
  }
}
