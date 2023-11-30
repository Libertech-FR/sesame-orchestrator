import { Controller, Logger, Get, Res, UseGuards } from '@nestjs/common';
import { BackendsService } from './backends.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Controller('backends')
@ApiTags('backends')
export class BackendsController {
  private readonly logger = new Logger(BackendsController.name);

  constructor(private backendsService: BackendsService) {}

  @Get('list')
  @ApiOperation({ summary: 'List backends from daemon' })
  @ApiResponse({ status: 200, description: 'List ok ' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('api-key'))
  async list(@Res() res: Response): Promise<Response> {
    const backend = await this.backendsService.list();
    return res.status(200).json(backend);
  }
  @Get('alive')
  @ApiOperation({ summary: 'test backends ' })
  @ApiResponse({ status: 200, description: 'command executed ' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('api-key'))
  async alive(@Res() res: Response): Promise<Response> {
    const backend = await this.backendsService.alive();
    return res.status(200).json(backend);
  }
}
