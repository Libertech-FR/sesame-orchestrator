import { Body, Controller, Get, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SmsadmService } from '~/settings/smsadm.service';
import { Response } from 'express';
import { SmsSettingsDto } from '~/settings/_dto/sms.settings.dto';
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types';
import { UseRoles } from '~/_common/decorators/use-roles.decorator';

@Controller('settings/sms')
@ApiTags('settings')
export class SmsadmController {
  public constructor(private smsadmService: SmsadmService) {}

  @Get('get')
  @UseRoles({
    resource: '/settings/smsadm',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Retourne les parametres pour l envoi SMS' })
  @ApiResponse({ status: HttpStatus.OK })
  public async get(@Res() res: Response): Promise<Response> {
    const data = await this.smsadmService.getParams();

    return res.status(HttpStatus.OK).json({ data });
  }

  @Post('set')
  @UseRoles({
    resource: '/settings/smsadm',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Enregistre les parametres' })
  @ApiResponse({ status: HttpStatus.OK })
  public async set(@Body() body: SmsSettingsDto, @Res() res: Response): Promise<Response> {
    const data = await this.smsadmService.setParams(body);

    return res.status(HttpStatus.OK).json({ data });
  }
}
