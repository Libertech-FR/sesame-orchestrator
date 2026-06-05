import { Controller } from '@nestjs/common';
import { ManagementService } from './management.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('management')
@Controller('management')
export class ManagementController {
  public constructor(private readonly _service: ManagementService) {}
}
