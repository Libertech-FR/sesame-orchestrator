import { Controller } from '@nestjs/common';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiTags } from '@nestjs/swagger';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { AuditsService } from '~/core/audits/audits.service';

@ApiTags('core/audits')
@Controller('audits')
export class AuditsController extends AbstractController {
  protected static readonly projection: PartialProjectionType<any> = {};

  public constructor(private readonly _service: AuditsService) {
    super();
  }
}
