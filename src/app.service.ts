import { BadRequestException, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PackageJson } from 'types-package-json';
import { ModuleRef } from '@nestjs/core';
import { readFileSync } from 'fs';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import { pick } from 'radash';
import { HttpService } from '@nestjs/axios';
import { LRUCache } from 'lru-cache';
import { catchError, firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';

export enum ProjectsList {
  SESAME_ORCHESTRATOR = 'sesame-orchestrator',
  SESAME_DAEMON = 'sesame-daemon',
  SESAME_APP_MANAGER = 'sesame-app-manager',
}

export interface GithubAuthor {
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

export interface GithubAsset {
  [key: string]: any;
}

export interface GithubUpdate {
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

@Injectable()
export class AppService extends AbstractService implements OnApplicationBootstrap {
  protected storage = new LRUCache({
    ttl: 1_000 * 60 * 60 * 6, // 6 hours
    ttlAutopurge: true,
  });

  protected package: Partial<PackageJson>;

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly httpService: HttpService,
  ) {
    super({ moduleRef });
    this.package = JSON.parse(readFileSync('package.json', 'utf-8'));
  }

  /**
   * On application bootstrap, this method is called to initialize the service.
   * It logs the start of the bootstrap process and fetches the latest releases for each project
   * in the ProjectsList enum.
   * It uses the fetchGithubRelease method to get the latest releases from GitHub.
   *
   * @returns {Promise<void>} A promise that resolves when the bootstrap process is complete.
   */
  public async onApplicationBootstrap(): Promise<void> {
    this.logger.debug('Application service bootstrap starting...');

    for (const project of Object.values(ProjectsList)) {
      this.logger.verbose(`Checking for updates for project: ${project}`);

      await this.fetchGithubRelease(project);
    }

    this.logger.log('Application service bootstrap completed.');
  }

  /**
   * Cron job to fetch the latest releases of projects every 6 hours.
   * This method logs the start and end of the job, and fetches updates for each project in the ProjectsList.
   * It uses the fetchGithubRelease method to get the latest releases from GitHub.
   * The job is scheduled using the CronExpression.EVERY_6_HOURS expression.
   *
   * @Cron(CronExpression.EVERY_6_HOURS)
   * @returns {Promise<void>}
   * @memberof AppService
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  public async handleCron(): Promise<void> {
    this.logger.debug('Cron job started.');

    for (const project of Object.values(ProjectsList)) {
      this.logger.verbose(`Checking for updates for project: ${project}`);

      await this.fetchGithubRelease(project);
    }

    this.logger.debug('Cron job completed.');
  }

  /**
   * Returns basic information about the application, such as name and version.
   *
   * @returns {Partial<PackageJson>} Returns basic information about the application, such as name and version.
   */
  public getInfo(): Partial<PackageJson> {
    return pick(this.package, ['name', 'version']);
  }

  /**
   * Fetches the latest release information for a specified project from GitHub.
   *
   * @param project The project name to fetch updates for.
   * @returns {Promise<GithubUpdate>} A promise that resolves to the latest release information for the specified project.
   */
  public getProjectUpdate(project: ProjectsList): GithubUpdate {
    if (!Object.values(ProjectsList).includes(project)) {
      throw new BadRequestException(`Invalid project: ${project}`);
    }

    if (this.storage.has(project)) {
      this.logger.debug(`Fetching ${project} tags from cache`);

      return this.storage.get(project) as GithubUpdate;
    }

    return null; // Return null if the project is not cached
  }

  /**
   * Fetches the latest release information for a specified project from GitHub.
   *
   * @param project The project name to fetch updates for.
   * @returns {Promise<GithubUpdate>} A promise that resolves to the latest release information for the specified project.
   */
  private async fetchGithubRelease(project: ProjectsList, retry = 0): Promise<any> {
    if (this.storage.has(project)) {
      this.logger.debug(`Fetching ${project} tags from cache`);

      return this.storage.get(project) as GithubUpdate;
    }

    this.logger.debug(`Fetching ${project} tags from GitHub API`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<GithubUpdate>(`https://api.github.com/repos/Libertech-FR/${project}/releasesppp/latest`).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching release for ${project}: ${error.message}`);
            throw error;
          })
        )
      );
      this.storage.set(project, data);
      return data;
    } catch (error) {
      if (retry >= 3) {
        this.logger.fatal(`Failed to fetch release for ${project} after multiple retries: ${error.message}`);

        return null; // Return null or handle as needed
      }

      setTimeout(() => {
        this.logger.verbose(`Retrying to fetch ${project} release after error: ${error.message}`);
        return this.fetchGithubRelease(project, retry + 1);
      }, 1_000 * 60); // Retry after 60 seconds
    }
  }
}
