import { BadRequestException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PackageJson } from 'types-package-json';
import { ModuleRef } from '@nestjs/core';
import { readFileSync } from 'fs';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import { pick } from 'radash';
import { HttpService } from '@nestjs/axios';
import { LRUCache } from 'lru-cache';
import { catchError, firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getLogLevel } from './_common/functions/get-log-level';
import { ConfigService } from '@nestjs/config';
import { isConsoleEntrypoint } from './_common/functions/is-cli';

/**
 * Énumération des projets Sesame disponibles pour la vérification de mises à jour.
 * @enum {string}
 */
export enum ProjectsList {
  /** Orchestrateur Sesame */
  SESAME_ORCHESTRATOR = 'sesame-orchestrator',
  /** Daemon Sesame */
  SESAME_DAEMON = 'sesame-daemon',
  /** Gestionnaire d'applications Sesame */
  SESAME_APP_MANAGER = 'sesame-app-manager',
}

/**
 * Interface représentant un auteur GitHub.
 */
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

/**
 * Interface représentant un asset GitHub d'une release.
 */
export interface GithubAsset {
  [key: string]: any;
}

/**
 * Interface représentant une release GitHub.
 */
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

/**
 * Service principal de l'application.
 *
 * Ce service gère les fonctionnalités globales de l'application, notamment
 * la récupération des informations de version et la vérification des mises à jour
 * disponibles pour les différents projets Sesame via l'API GitHub.
 *
 * @class AppService
 * @extends {AbstractService}
 * @implements {OnApplicationBootstrap}
 *
 * @description
 * Fonctionnalités principales :
 * - Récupération des informations du package (nom, version)
 * - Vérification périodique des mises à jour via l'API GitHub
 * - Cache LRU des releases GitHub (TTL 6 heures)
 * - Tâche planifiée toutes les 6 heures pour actualiser les informations
 * - Configuration du niveau de log en mode console
 *
 * Le service utilise un cache pour limiter les appels à l'API GitHub et améliorer
 * les performances. Les données sont automatiquement rafraîchies toutes les 6 heures.
 */
@Injectable()
export class AppService extends AbstractService implements OnApplicationBootstrap {
  /**
   * Cache LRU pour stocker les informations de releases GitHub.
   * TTL de 6 heures avec purge automatique.
   *
   * @protected
   * @type {LRUCache}
   */
  protected storage = new LRUCache({
    ttl: 1_000 * 60 * 60 * 6, // 6 heures
    ttlAutopurge: true,
  });

  /**
   * Informations du package.json de l'application.
   *
   * @protected
   * @type {Partial<PackageJson>}
   */
  protected package: Partial<PackageJson>;

  /**
   * Constructeur du service AppService.
   *
   * @param {ModuleRef} moduleRef - Référence au module NestJS
   * @param {HttpService} httpService - Service HTTP pour les appels à l'API GitHub
   * @param {ConfigService} config - Service de configuration
   */
  public constructor(
    protected moduleRef: ModuleRef,
    private readonly httpService: HttpService,
    private readonly config: ConfigService<any>,
  ) {
    super({ moduleRef });
    this.package = JSON.parse(readFileSync('package.json', 'utf-8'));
  }

  /**
   * Hook appelé au démarrage de l'application.
   *
   * Initialise le service en récupérant les dernières releases pour chaque projet
   * Sesame disponible. Configure également le niveau de log approprié en mode console.
   *
   * @async
   * @returns {Promise<void>}
   */
  public async onApplicationBootstrap(): Promise<void> {
    this.logger.debug('Application service bootstrap starting...');

    if (process.env.NODE_ENV === 'development') {
      this.logger.warn('Skipping GitHub release fetch in development mode.');
    } else {
      for (const project of Object.values(ProjectsList)) {
        this.logger.verbose(`Checking for updates for project: ${project}`);
        await this.fetchGithubRelease(project);
      }
    }

    this.logger.log('Application service bootstrap completed.');

    if (isConsoleEntrypoint) {
      // Réactive le logger avec le niveau de log approprié en mode console
      this.logger.localInstance.setLogLevels(
        getLogLevel(this.config.get('application.logLevel', 'debug'))
      );
    }
  }

  /**
   * Tâche planifiée pour rafraîchir les releases toutes les 6 heures.
   *
   * Récupère automatiquement les dernières versions disponibles pour chaque projet
   * depuis GitHub. Ignorée en mode développement et en mode console.
   *
   * @async
   * @returns {Promise<void>}
   *
   * @description
   * Planification : Toutes les 6 heures via @Cron
   *
   * Comportement :
   * - Mode console : Skip l'exécution
   * - Mode développement : Skip la récupération des releases
   * - Mode production : Récupère les releases pour tous les projets
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  public async handleCron(): Promise<void> {
    if (isConsoleEntrypoint()) {
      this.logger.verbose('Skipping LifecycleService cron job in console mode.');
      return;
    }

    this.logger.debug('Cron job started.');

    if (process.env.NODE_ENV === 'development') {
      this.logger.warn('Skipping GitHub release fetch in development mode.');
    } else {
      for (const project of Object.values(ProjectsList)) {
        this.logger.verbose(`Checking for updates for project: ${project}`);
        await this.fetchGithubRelease(project);
      }
    }

    this.logger.debug('Cron job completed.');
  }

  /**
   * Retourne les informations de base de l'application.
   *
   * Extrait le nom et la version depuis le package.json.
   *
   * @returns {Partial<PackageJson>} Informations de l'application (nom, version)
   *
   * @example
   * ```typescript
   * const info = appService.getInfo();
   * // { name: "sesame-orchestrator", version: "1.2.3" }
   * ```
   */
  public getInfo(): Partial<PackageJson> {
    return pick(this.package, ['name', 'version']);
  }

  /**
   * Récupère les informations de mise à jour pour un projet depuis le cache.
   *
   * Retourne les informations de la dernière release GitHub si elles sont
   * présentes dans le cache, sinon retourne null.
   *
   * @param {ProjectsList} project - Nom du projet
   * @returns {GithubUpdate | null} Informations de la dernière release ou null
   * @throws {BadRequestException} Si le nom du projet est invalide
   *
   * @description
   * Cette méthode ne fait pas d'appel à l'API GitHub, elle consulte uniquement
   * le cache. Les données sont mises en cache par fetchGithubRelease().
   */
  public getProjectUpdate(project: ProjectsList): GithubUpdate {
    if (!Object.values(ProjectsList).includes(project)) {
      throw new BadRequestException(`Invalid project: ${project}`);
    }

    if (this.storage.has(project)) {
      this.logger.debug(`Fetching ${project} tags from cache`);

      return this.storage.get(project) as GithubUpdate;
    }

    return null; // Retourne null si le projet n'est pas en cache
  }

  /**
   * Récupère les informations de la dernière release depuis l'API GitHub.
   *
   * Interroge l'API GitHub pour obtenir la dernière release d'un projet,
   * met en cache le résultat et implémente une logique de retry en cas d'erreur.
   *
   * @private
   * @async
   * @param {ProjectsList} project - Nom du projet
   * @param {number} [retry=0] - Nombre de tentatives effectuées
   * @returns {Promise<GithubUpdate | null>} Informations de la release ou null en cas d'échec
   *
   * @description
   * Processus de récupération :
   * 1. Vérifie si les données sont déjà en cache
   * 2. Si non, interroge l'API GitHub
   * 3. Met en cache le résultat (TTL 6 heures)
   * 4. En cas d'erreur, retry jusqu'à 3 fois avec délai de 60 secondes
   * 5. Après 3 échecs, log une erreur fatale et retourne null
   */
  private async fetchGithubRelease(project: ProjectsList, retry = 0): Promise<any> {
    if (this.storage.has(project)) {
      this.logger.debug(`Fetching ${project} tags from cache`);

      return this.storage.get(project) as GithubUpdate;
    }

    this.logger.debug(`Fetching ${project} tags from GitHub API`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<GithubUpdate>(`https://api.github.com/repos/Libertech-FR/${project}/releases/latest`).pipe(
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

        return null; // Retourne null après 3 tentatives échouées
      }

      setTimeout(() => {
        this.logger.verbose(`Retrying to fetch ${project} release after error: ${error.message}`);
        return this.fetchGithubRelease(project, retry + 1);
      }, 1_000 * 60); // Retry après 60 secondes
    }
  }
}
