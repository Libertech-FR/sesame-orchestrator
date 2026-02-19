import { Injectable } from '@nestjs/common';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { Logger } from './_schemas/logger.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class LoggerService<T extends Logger = Logger> extends AbstractServiceSchema<T> {
  constructor(@InjectModel(Logger.name) protected _model: Model<T>) {
    super();
  }
}
