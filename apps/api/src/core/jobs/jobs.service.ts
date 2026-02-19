import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { Jobs } from './_schemas/jobs.schema';
import { Model } from 'mongoose';

@Injectable()
export class JobsService extends AbstractServiceSchema<Jobs> {
  public constructor(@InjectModel(Jobs.name) protected _model: Model<Jobs>) {
    super();
  }
}
