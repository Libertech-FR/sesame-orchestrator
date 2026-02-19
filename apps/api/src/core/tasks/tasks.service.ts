import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { Tasks } from './_schemas/tasks.schema';

@Injectable()
export class TasksService extends AbstractServiceSchema<Tasks> {
  public constructor(@InjectModel(Tasks.name) protected _model: Model<Tasks>) {
    super();
  }
}
