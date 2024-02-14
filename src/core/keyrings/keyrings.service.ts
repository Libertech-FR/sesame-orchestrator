import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Keyrings } from '~/core/keyrings/_schemas/keyrings.schema';
import { Model } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';

@Injectable()
export class KeyringsService extends AbstractServiceSchema {
  constructor(@InjectModel(Keyrings.name) protected _model: Model<Keyrings>) {
    super();
  }
}
