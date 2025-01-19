import { CallHandler, ExecutionContext, Injectable, NestMiddleware } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request, Response } from 'express';
import { Model } from 'mongoose';
import { Identities } from '~/management/identities/_schemas/identities.schema';

@Injectable()
export class EnsureIdentitiesIndexMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Identities.name) private readonly identityModel: Model<Identities>,
  ) { }

  public async use(req: Request, res: Response, next: () => void) {
    try {
      await this.identityModel.ensureIndexes();
      // console.log('Indexes synchronized.');
    } catch (err) {
      console.error('Erreur lors de la création des index :', err);
    }
    next();
  }
}
