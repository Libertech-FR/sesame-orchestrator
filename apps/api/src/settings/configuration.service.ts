import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { existsSync, readFileSync } from 'fs';
import Redis from 'ioredis';
import { Connection } from 'mongoose';
import { hostname, platform, arch, cpus, totalmem, freemem, uptime as osUptime } from 'os';
import { join } from 'path';
import { PackageJson } from 'types-package-json';
import { ConfigInstance } from '~/config';
import {
  DependencyContainerMetadata,
  DockerContainerMetadata,
  DockerVolumeSnapshot,
  resolveDependencyContainerMetadata,
  resolveDockerVolumes,
  SesameVolumeStatus,
} from '~/_common/functions/resolve-docker-volumes.function';
import { isSensitiveEnvKey, maskSensitiveValue } from '~/_common/functions/mask-sensitive-value.function';

export interface ConfigurationEnvironmentVariable {
  key: string;
  value: string;
  sensitive: boolean;
}

export interface ConfigurationApiFrameworkVersions {
  nestjs: string | null;
  mongoose: string | null;
  express: string | null;
  typescript: string | null;
  ioredis: string | null;
  bullmq: string | null;
}

export interface ConfigurationWebFrameworkVersions {
  nuxt: string | null;
  vue: string | null;
  quasar: string | null;
  typescript: string | null;
}

export interface ConfigurationProcessInfo {
  pid: number;
  uptimeSeconds: number;
  cwd: string;
}

export interface ConfigurationDependencyService {
  status: 'up' | 'down' | 'unknown';
  serverVersion: string | null;
  driverVersion: string | null;
  endpoint: string | null;
  docker: DependencyContainerMetadata | null;
  metadata: Record<string, string>;
}

export interface ConfigurationPayload {
  application: {
    name: string;
    version: string;
    description: string | null;
    buildVersion: string | null;
  };
  container: {
    hostname: string;
    platform: string;
    arch: string;
    nodeEnv: string;
    nodeVersion: string;
    timezone: string;
    cpuCores: number;
    memoryTotalMb: number;
    memoryFreeMb: number;
    osUptimeSeconds: number;
    imageTag: string;
    git: {
      branch: string;
      commit: string;
    };
    volumes: SesameVolumeStatus[];
    docker: DockerContainerMetadata;
    apiRootDir: string;
    webRootDir: string;
  };
  processes: {
    api: ConfigurationProcessInfo;
  };
  frameworks: {
    node: string;
    api: ConfigurationApiFrameworkVersions;
    web: ConfigurationWebFrameworkVersions;
  };
  dependencies: {
    mongodb: ConfigurationDependencyService;
    redis: ConfigurationDependencyService;
  };
  environment: {
    api: ConfigurationEnvironmentVariable[];
  };
  resolvedConfig: Record<string, unknown>;
}

@Injectable()
export class ConfigurationService {
  private readonly rootPackage: Partial<PackageJson>;
  private readonly apiPackage: Partial<PackageJson>;
  private readonly webPackage: Partial<PackageJson>;
  private readonly apiRootDir: string;
  private readonly webRootDir: string;
  private readonly monorepoRootDir: string;

  public constructor(
    private readonly configService: ConfigService<ConfigInstance>,
    @InjectConnection() private readonly mongoConnection: Connection,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.apiRootDir = this.getApiRootDir();
    this.webRootDir = join(this.apiRootDir, '..', 'web');
    this.monorepoRootDir = join(this.apiRootDir, '..', '..');
    this.rootPackage = this.readPackageJson(join(this.monorepoRootDir, 'package.json'));
    this.apiPackage = this.readPackageJson(join(this.apiRootDir, 'package.json'));
    this.webPackage = this.readPackageJson(join(this.webRootDir, 'package.json'));
  }

  public async getConfiguration(): Promise<ConfigurationPayload> {
    const apiRootDir = this.apiRootDir;
    const webRootDir = this.webRootDir;
    const dockerSnapshot: DockerVolumeSnapshot = await resolveDockerVolumes();
    const apiEnvVariables = this.collectEnvironmentVariables();
    const [mongodb, redis] = await Promise.all([this.getMongoDependency(), this.getRedisDependency()]);

    return {
      application: {
        name: this.rootPackage.name || 'sesame-orchestrator',
        version: this.rootPackage.version || '0.0.0',
        description: this.rootPackage.description || null,
        buildVersion: process.env.BUILD_VERSION || null,
      },
      container: {
        hostname: hostname(),
        platform: platform(),
        arch: arch(),
        nodeEnv: process.env.NODE_ENV || 'unknown',
        nodeVersion: process.version,
        timezone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
        cpuCores: cpus().length,
        memoryTotalMb: Number((totalmem() / (1024 * 1024)).toFixed(2)),
        memoryFreeMb: Number((freemem() / (1024 * 1024)).toFixed(2)),
        osUptimeSeconds: Number(osUptime().toFixed(2)),
        imageTag: process.env.DOCKER_TAG || process.env.IMAGE_TAG || 'unknown',
        git: {
          branch: process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME || 'unknown',
          commit: process.env.GIT_COMMIT || process.env.GIT_SHA || process.env.GITHUB_SHA || 'unknown',
        },
        volumes: dockerSnapshot.volumes,
        docker: dockerSnapshot.metadata,
        apiRootDir,
        webRootDir,
      },
      processes: {
        api: {
          pid: process.pid,
          uptimeSeconds: Number(process.uptime().toFixed(2)),
          cwd: process.cwd(),
        },
      },
      frameworks: this.getFrameworkVersions(),
      dependencies: {
        mongodb,
        redis,
      },
      environment: {
        api: apiEnvVariables,
      },
      resolvedConfig: this.getResolvedConfig(),
    };
  }

  private async getMongoDependency(): Promise<ConfigurationDependencyService> {
    const mongooseConfig = this.configService.get<ConfigInstance['mongoose']>('mongoose');
    const endpoint = this.maskUri(mongooseConfig?.uri || '');
    const driverVersion = this.readFrameworkVersion(this.apiPackage, 'mongoose', [
      this.apiRootDir,
      this.monorepoRootDir,
      process.cwd(),
    ]);
    const containerName = (process.env.SESAME_MONGO_CONTAINER_NAME || 'sesame-mongo').trim();
    const docker = await resolveDependencyContainerMetadata(containerName);

    if (this.mongoConnection.readyState !== 1 || !this.mongoConnection.db) {
      return {
        status: 'down',
        serverVersion: null,
        driverVersion,
        endpoint,
        docker,
        metadata: {
          database: this.mongoConnection.name || '',
        },
      };
    }

    try {
      const buildInfo = (await this.mongoConnection.db.admin().buildInfo()) as Record<string, unknown>;

      return {
        status: 'up',
        serverVersion: `${buildInfo.version || ''}` || null,
        driverVersion,
        endpoint,
        docker,
        metadata: {
          database: this.mongoConnection.db.databaseName,
          gitVersion: `${buildInfo.gitVersion || ''}` || '',
          storageEngine: `${buildInfo.storageEngine || ''}`,
        },
      };
    } catch {
      return {
        status: 'unknown',
        serverVersion: null,
        driverVersion,
        endpoint,
        docker,
        metadata: {
          database: this.mongoConnection.db.databaseName,
        },
      };
    }
  }

  private async getRedisDependency(): Promise<ConfigurationDependencyService> {
    const redisConfig = this.configService.get<ConfigInstance['ioredis']>('ioredis');
    const endpoint = this.maskUri(redisConfig?.uri || '');
    const driverVersion = this.readFrameworkVersion(this.apiPackage, 'ioredis', [
      this.apiRootDir,
      this.monorepoRootDir,
      process.cwd(),
    ]);
    const containerName = (process.env.SESAME_REDIS_CONTAINER_NAME || 'sesame-redis').trim();
    const docker = await resolveDependencyContainerMetadata(containerName);

    try {
      const info = this.parseRedisInfo(await this.redis.info());
      const ping = await this.redis.ping();

      return {
        status: ping === 'PONG' ? 'up' : 'unknown',
        serverVersion: info.redis_version || null,
        driverVersion,
        endpoint,
        docker,
        metadata: {
          mode: info.redis_mode || '',
          os: info.os || '',
          arch_bits: info.arch_bits || '',
          tcp_port: info.tcp_port || '',
        },
      };
    } catch {
      return {
        status: 'down',
        serverVersion: null,
        driverVersion,
        endpoint,
        docker,
        metadata: {},
      };
    }
  }

  private parseRedisInfo(raw: string): Record<string, string> {
    const parsed: Record<string, string> = {};

    for (const line of raw.split('\n')) {
      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) {
        continue;
      }

      parsed[line.slice(0, separatorIndex)] = line.slice(separatorIndex + 1).trim();
    }

    return parsed;
  }

  private getApiRootDir(): string {
    return process.env.SESAME_API_ROOT_DIR || join(__dirname, '..', '..');
  }

  private readPackageJson(filePath: string): Partial<PackageJson> {
    if (!existsSync(filePath)) {
      return {};
    }

    return JSON.parse(readFileSync(filePath, 'utf8')) as Partial<PackageJson>;
  }

  private readDeclaredVersion(packageJson: Partial<PackageJson>, dependency: string): string | null {
    const raw = packageJson.dependencies?.[dependency] || packageJson.devDependencies?.[dependency];
    if (!raw) {
      return null;
    }

    return `${raw}`.replace(/^[\^~>=<]+/, '');
  }

  private readInstalledVersion(dependency: string, searchRoots: string[]): string | null {
    for (const root of searchRoots) {
      try {
        const packageJsonPath = require.resolve(`${dependency}/package.json`, { paths: [root] });
        const installedPackage = this.readPackageJson(packageJsonPath);

        if (installedPackage.version) {
          return installedPackage.version;
        }
      } catch {
        // Package not resolved from this root, try the next one.
      }
    }

    return null;
  }

  private readFrameworkVersion(
    packageJson: Partial<PackageJson>,
    dependency: string,
    searchRoots: string[],
  ): string | null {
    return this.readInstalledVersion(dependency, searchRoots) || this.readDeclaredVersion(packageJson, dependency);
  }

  private getFrameworkVersions(): ConfigurationPayload['frameworks'] {
    const apiSearchRoots = [this.apiRootDir, this.monorepoRootDir, process.cwd()];
    const webSearchRoots = [this.webRootDir, this.monorepoRootDir, process.cwd()];

    return {
      node: process.version,
      api: {
        nestjs: this.readFrameworkVersion(this.apiPackage, '@nestjs/core', apiSearchRoots),
        mongoose: this.readFrameworkVersion(this.apiPackage, 'mongoose', apiSearchRoots),
        express:
          this.readFrameworkVersion(this.apiPackage, 'express', apiSearchRoots) ||
          this.readFrameworkVersion(this.apiPackage, '@nestjs/platform-express', apiSearchRoots),
        typescript: this.readFrameworkVersion(this.apiPackage, 'typescript', apiSearchRoots),
        ioredis: this.readFrameworkVersion(this.apiPackage, 'ioredis', apiSearchRoots),
        bullmq: this.readFrameworkVersion(this.apiPackage, 'bullmq', apiSearchRoots),
      },
      web: {
        nuxt: this.readFrameworkVersion(this.webPackage, 'nuxt', webSearchRoots),
        vue: this.readFrameworkVersion(this.webPackage, 'vue', webSearchRoots),
        quasar: this.readFrameworkVersion(this.webPackage, 'quasar', webSearchRoots),
        typescript: this.readFrameworkVersion(this.webPackage, 'typescript', webSearchRoots),
      },
    };
  }

  private collectEnvironmentVariables(): ConfigurationEnvironmentVariable[] {
    const keys = Object.keys(process.env)
      .filter(
        (key) =>
          key.startsWith('SESAME_') ||
          ['NODE_ENV', 'TZ', 'LANG', 'BUILD_VERSION', 'GIT_BRANCH', 'GIT_COMMIT', 'DOCKER_TAG'].includes(key),
      )
      .sort((a, b) => a.localeCompare(b));

    return keys.map((key) => {
      const rawValue = process.env[key] || '';
      const masked = maskSensitiveValue(key, rawValue);

      return {
        key,
        value: masked.value,
        sensitive: masked.sensitive || isSensitiveEnvKey(key),
      };
    });
  }

  private getResolvedConfig(): Record<string, unknown> {
    const mongoose = this.configService.get<ConfigInstance['mongoose']>('mongoose');
    const ioredis = this.configService.get<ConfigInstance['ioredis']>('ioredis');
    const sms = this.configService.get<ConfigInstance['sms']>('sms');
    const swagger = this.configService.get<ConfigInstance['swagger']>('swagger');

    const config = {
      application: this.configService.get('application'),
      mongoose: {
        uri: this.maskUri(mongoose?.uri || ''),
        options: mongoose?.options,
      },
      ioredis: {
        uri: this.maskUri(ioredis?.uri || ''),
      },
      axios: this.configService.get('axios'),
      cron: this.configService.get('cron'),
      factorydrive: this.configService.get('factorydrive'),
      mailer: this.configService.get('mailer'),
      frontPwd: this.configService.get('frontPwd'),
      lifecycle: this.configService.get('lifecycle'),
      identities: this.configService.get('identities'),
      sms: {
        host: sms?.host || '',
        systemId: sms?.systemId || '',
        password: '***',
        sourceAddr: sms?.sourceAddr || '',
        regionCode: sms?.regionCode || '',
      },
      swagger: {
        path: swagger?.path,
        api: swagger?.api,
      },
    };

    return config;
  }

  private maskUri(value: string): string {
    return maskSensitiveValue('URI', value).value;
  }
}
