import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from '~/settings/settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  public constructor(private readonly _service: SettingsService) {}
}
