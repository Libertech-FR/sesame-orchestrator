import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import { Tasks } from './_schemas/tasks.schema';

@Injectable()
export class TasksService extends AbstractService {
  constructor(@InjectModel(Tasks.name) protected _model: Model<Tasks>) {
    super();
  }
}
