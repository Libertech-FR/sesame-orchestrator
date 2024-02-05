import { Controller } from '@nestjs/common'
import { KeyringsService } from './keyrings.service'
import { AbstractController } from '~/_common/abstracts/abstract.controller';

@Controller('keyrings')
export class KeyringsController extends AbstractController {
  constructor(private readonly service: KeyringsService) {
    super()
  }
}
