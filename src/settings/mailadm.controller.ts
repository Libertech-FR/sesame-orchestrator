import { Body, Controller, Get, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { MailadmService } from '~/settings/mailadm.service';
import { MailSettingsDto } from '~/settings/_dto/mail.settings.dto';

@Controller('settings/mail')
@ApiTags('settings')
export class MailadmController {
  public constructor(private mailadmService: MailadmService) { }

  @Get('get')
  @ApiOperation({ summary: 'Retourne les parametres pour l envoi Mail' })
  @ApiResponse({ status: HttpStatus.OK })
  public async get(@Res() res: Response): Promise<Response> {
    const data = await this.mailadmService.getParams();

    return res.status(HttpStatus.OK).json({ data });
  }

  @Post('set')
  @ApiOperation({ summary: 'Enregistre les parametres' })
  @ApiResponse({ status: HttpStatus.OK })
  public async set(@Body() body: MailSettingsDto, @Res() res: Response): Promise<Response> {
    const data = await this.mailadmService.setParams(body);

    return res.status(HttpStatus.OK).json({ data });
  }
}
