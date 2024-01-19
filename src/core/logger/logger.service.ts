import { Injectable } from '@nestjs/common';
import { AbstractService } from '~/_common/abstracts/abstract.service';

@Injectable()
export class LoggerService extends AbstractService {
  constructor() {
    super();
  }
}
