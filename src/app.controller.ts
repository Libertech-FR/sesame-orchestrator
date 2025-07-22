import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { AppService, ProjectsList } from './app.service';
import { Response } from 'express';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { Public } from './_common/decorators/public.decorator';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

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

  @ApiQuery({ name: 'current', required: false })
  @Get('/get-update/:project(sesame-orchestrator|sesame-daemon|sesame-app-manager)')
  public async update(
    @Res() res: Response,
    @Param('project') project?: ProjectsList,
    @Query('current') current?: string,
  ): Promise<Response> {
    const pkgInfo = this.appService.getInfo();
    const currentVersion = current || pkgInfo.version;
    const [lastMajor, lastMinor, lastPatch] = currentVersion.split('.').map(Number);

    /**
     * If the project is not the same as the package name or if a current version is provided,
     * we validate the current version format.
     * If the current version is not in the format X.Y.Z, we throw a BadRequestException.
     *
     * This ensures that the current version is always in a valid format before proceeding with the comparison.
     */
    if (project !== pkgInfo.name || current) {
      if (!/[0-9]+\.[0-9]+\.[0-9]+/.test(current)) {
        throw new BadRequestException('Invalid version for current parameter');
      }
    }

    let lastVersion = '0.0.0';
    let updateAvailable = false;
    let data = await this.appService.getProjectUpdate(project);

    if (data) {
      lastVersion = data.tag_name.replace(/^v/, '');
      const [currentMajor, currentMinor, currentPatch] = lastVersion.split('.').map(Number);
      updateAvailable = currentMajor > lastMajor || currentMinor > lastMinor || currentPatch > lastPatch;
    }

    return res.json({
      data: {
        project,
        updateAvailable,
        currentVersion,
        lastVersion,
      },
    });
  }
}
