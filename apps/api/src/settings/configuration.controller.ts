import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UseRoles } from '~/_common/decorators/use-roles.decorator';
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types';
import { ConfigurationService } from './configuration.service';

@Controller('settings/configuration')
@ApiTags('settings')
export class ConfigurationController {
  public constructor(private readonly configurationService: ConfigurationService) {}

  @Get()
  @UseRoles({
    resource: '/settings/configuration',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Retourne la configuration système actuelle de Sesame (API)' })
  @ApiResponse({ status: HttpStatus.OK })
  public async getConfiguration(@Res() res: Response): Promise<Response> {
    const data = await this.configurationService.getConfiguration();

    return res.status(HttpStatus.OK).json({ data });
  }
}
