import { Controller } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { AbstractController } from '~/_common/abstracts/abstract.controller';

@Controller('logger')
export class LoggerController extends AbstractController {
  constructor(private readonly _service: LoggerService) {
    super();
  }
}
