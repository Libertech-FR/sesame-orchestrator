import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { Public } from './_common/decorators/public.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface GithubUpdate {
  name?: string;
  commit?: {
    sha?: string;
    url?: string;
  };
  zipball_url?: string;
  tarball_url?: string;
  node_id?: string;
}

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

  @Get('/get-update/:project(sesame-orchestrator|sesame-daemon|sesame-app-manager)')
  public async update(
    @Res() res: Response,
    @Param('project') project: string,
    @Query('current') current: string,
  ): Promise<Response> {
    const update = await fetch(`https://api.github.com/repos/Libertech-FR/${project}/tags`)
    const data: GithubUpdate = await update.json()
    const lastVersion = data[0].name.replace(/^v/, '')
    const pkgInfo = this.appService.getInfo()
    const currentVersion = current || pkgInfo.version

    if (project !== pkgInfo.name) {
      if (!/[0-9]+\.[0-9]+\.[0-9]+/.test(current)) {
        throw new BadRequestException('Invalid version for current parameter')
      }
    }

    const [currentMajor, currentMinor, currentPatch] = lastVersion.split('.').map(Number)
    const [lastMajor, lastMinor, lastPatch] = currentVersion.split('.').map(Number)
    const updateAvailable = currentMajor > lastMajor || currentMinor > lastMinor || currentPatch > lastPatch

    return res.json({
      project,
      updateAvailable,
      currentVersion,
      lastVersion,
    });
  }
}
