import { Controller } from '@nestjs/common';
import { CoreService } from './core.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('core')
@Controller('core')
export class CoreController {
  public constructor(private readonly _service: CoreService) {}
}
