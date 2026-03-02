import { Body, Controller, Get, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { MailadmService } from '~/settings/mailadm.service';
import { MailSettingsDto } from '~/settings/_dto/mail.settings.dto';
import { UseRoles } from '~/_common/decorators/use-roles.decorator';
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types';

@Controller('settings/mail')
@ApiTags('settings')
export class MailadmController {
  public constructor(private mailadmService: MailadmService) {}

  @Get('get')
  @UseRoles({
    resource: '/settings/mailadm',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Retourne les parametres pour l envoi Mail' })
  @ApiResponse({ status: HttpStatus.OK })
  public async get(@Res() res: Response): Promise<Response> {
    const data = await this.mailadmService.getParams();

    return res.status(HttpStatus.OK).json({ data });
  }

  @Post('set')
  @UseRoles({
    resource: '/settings/mailadm',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Enregistre les parametres' })
  @ApiResponse({ status: HttpStatus.OK })
  public async set(@Body() body: MailSettingsDto, @Res() res: Response): Promise<Response> {
    const data = await this.mailadmService.setParams(body);

    return res.status(HttpStatus.OK).json({ data });
  }
}
