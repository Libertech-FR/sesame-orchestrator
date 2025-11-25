import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { AppService, ProjectsList } from './app.service';
import { Response } from 'express';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { Public } from './_common/decorators/public.decorator';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

/**
 * Contrôleur principal de l'application.
 *
 * Ce contrôleur expose les endpoints racine de l'API, incluant les informations
 * sur l'application, la vérification des mises à jour et les utilitaires de debug.
 *
 * @class AppController
 * @extends {AbstractController}
 *
 * @description
 * Endpoints disponibles :
 * - GET / - Informations sur l'API (version, nom, etc.)
 * - GET /get-update/:project - Vérification des mises à jour disponibles
 * - GET /debug-sentry - Endpoint de test pour Sentry (erreur forcée)
 */
@Public()
@Controller()
@ApiBearerAuth()
// @see https://stackoverflow.com/questions/67314808/how-to-disable-security-for-a-specific-controller-method-in-nestjs-swagger
export class AppController extends AbstractController {
  /**
   * Constructeur du contrôleur AppController.
   *
   * @param {AppService} appService - Service principal de l'application
   */
  constructor(private readonly appService: AppService) {
    super();
  }

  /**
   * Récupère les informations de l'API.
   *
   * Retourne les métadonnées de l'application telles que le nom,
   * la version, la description, etc. provenant du package.json.
   *
   * @param {Response} res - Objet de réponse Express
   * @returns {Response} Informations de l'API au format JSON
   *
   * @example
   * ```typescript
   * // GET /
   * {
   *   name: "sesame-orchestrator",
   *   version: "1.2.3",
   *   description: "Orchestrateur Sesame",
   *   ...
   * }
   * ```
   */
  @Get()
  @ApiOperation({ summary: 'Get API infos' })
  @ApiResponse({ status: 200, description: 'Return API infos' })
  public getInfo(@Res() res: Response): Response {
    return res.json({
      ...this.appService.getInfo(),
    });
  }

  /**
   * Vérifie les mises à jour disponibles pour un projet.
   *
   * Compare la version actuelle du projet avec la dernière version disponible
   * sur GitHub et indique si une mise à jour est disponible.
   *
   * @param {Response} res - Objet de réponse Express
   * @param {ProjectsList} [project] - Nom du projet à vérifier
   * @param {string} [current] - Version actuelle du projet (optionnel, format X.Y.Z)
   * @returns {Promise<Response>} Informations sur les mises à jour disponibles
   * @throws {BadRequestException} Si le paramètre current n'est pas au format X.Y.Z
   *
   * @description
   * Processus de vérification :
   * 1. Récupère la version actuelle (paramètre ou version du package)
   * 2. Valide le format de version si fourni (doit être X.Y.Z)
   * 3. Interroge l'API GitHub pour récupérer la dernière release
   * 4. Compare les versions (majeur, mineur, patch)
   * 5. Retourne le résultat avec indication de mise à jour disponible
   *
   * Projets supportés :
   * - sesame-orchestrator
   * - sesame-daemon
   * - sesame-app-manager
   *
   * @example
   * ```typescript
   * // GET /get-update/sesame-orchestrator?current=1.2.3
   * {
   *   data: {
   *     project: "sesame-orchestrator",
   *     updateAvailable: true,
   *     currentVersion: "1.2.3",
   *     lastVersion: "1.3.0"
   *   }
   * }
   * ```
   */
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

    // Validation du format de version si le projet est différent ou si une version est fournie
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

  /**
   * Endpoint de debug pour tester l'intégration Sentry.
   *
   * Génère volontairement une erreur pour vérifier que les erreurs
   * sont correctement capturées et envoyées à Sentry.
   *
   * @throws {Error} Erreur de test Sentry
   *
   * @example
   * ```typescript
   * // GET /debug-sentry
   * // Lance une erreur "My first Sentry error!"
   * ```
   */
  @Get("/debug-sentry")
  getError() {
    throw new Error("My first Sentry error!");
  }
}
