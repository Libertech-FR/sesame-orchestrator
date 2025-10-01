import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Audits } from '~/core/audits/_schemas/audits.schema';
import { Model } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';

@Injectable()
export class AuditsService extends AbstractServiceSchema {
  constructor(@InjectModel(Audits.name) protected _model: Model<Audits>) {
    super();
  }
}
