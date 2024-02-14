import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Agents } from '~/core/agents/_schemas/agents.schema';
import { Model } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';

@Injectable()
export class AgentsService extends AbstractServiceSchema {
  constructor(@InjectModel(Agents.name) protected _model: Model<Agents>) {
    super();
  }
}
