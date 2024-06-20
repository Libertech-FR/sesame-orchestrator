import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { Public } from './_common/decorators/public.decorator';
import { ApiBasicAuth, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Public()
@Controller()
@ApiBearerAuth()
// @see https://stackoverflow.com/questions/67314808/how-to-disable-security-for-a-specific-controller-method-in-nestjs-swagger
export class AppController extends AbstractController {
  constructor(private readonly appService: AppService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: 'Get API infos' })
  @ApiResponse({ status: 200, description: 'Return API infos' })
  public getInfo(@Res() res: Response): Response {
    return res.json({
      ...this.appService.getInfo(),
    });
  }
}
