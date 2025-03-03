import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { Public } from './_common/decorators/public.decorator';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { LRUCache } from 'lru-cache';

interface GithubAuthor {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
}

interface GithubAsset {
  [key: string]: any;
}

interface GithubUpdate {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  author: GithubAuthor;
  node_id: string;
  tag_name: string;
  target_commitish: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  assets: GithubAsset[];
  tarball_url: string;
  zipball_url: string;
  body: string;
}

const storage = new LRUCache({
  ttl: 1000 * 60 * 60,
  ttlAutopurge: true,
});

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
    @Param('project') project?: string,
    @Query('current') current?: string,
  ): Promise<Response> {
    let data = <GithubUpdate>{};
    // console.log('this.storage', storage.get(project))
    if (storage.has(project)) {
      this.logger.log(`Fetching ${project} tags from cache`);
      data = storage.get(project) as GithubUpdate;
    } else {
      this.logger.log(`Fetching ${project} tags`);
      const update = await fetch(`https://api.github.com/repos/Libertech-FR/${project}/releases/latest`, {
        signal: AbortSignal.timeout(1000),
      });
      data = await update.json();
      console.log('update', data)
      storage.set(project, data);
      // console.log('this.storage', storage.get(project))
    }
    // if (!Array.isArray(data)) {
    //   throw new BadRequestException(`Invalid data from Github <${JSON.stringify(data)}>`);
    // }
    const lastVersion = data.tag_name.replace(/^v/, '');
    const pkgInfo = this.appService.getInfo();
    const currentVersion = current || pkgInfo.version;

    if (project !== pkgInfo.name || current) {
      if (!/[0-9]+\.[0-9]+\.[0-9]+/.test(current)) {
        throw new BadRequestException('Invalid version for current parameter');
      }
    }

    const [currentMajor, currentMinor, currentPatch] = lastVersion.split('.').map(Number);
    const [lastMajor, lastMinor, lastPatch] = currentVersion.split('.').map(Number);
    const updateAvailable = currentMajor > lastMajor || currentMinor > lastMinor || currentPatch > lastPatch;

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
