import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { FilterOptions, SearchFilterOptions } from '~/_common/restools'
import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { AbstractController } from '~/_common/abstracts/abstract.controller'
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe'
import { Lifecycle } from './_schemas/lifecycle.schema'
import { LifecycleCrudService } from './lifecycle-crud.service'
import { LifecycleCacheInterceptor } from './_interceptors/lifecycle-cache.interceptor'

/**
 * Contrôleur de gestion du cycle de vie des identités
 *
 * @class LifecycleController
 * @extends AbstractController
 * @description Fournit les endpoints REST pour :
 * - Consulter l'historique du cycle de vie d'une identité
 * - Récupérer les statistiques globales du cycle de vie
 * - Obtenir la liste des états disponibles (par défaut + personnalisés)
 * - Consulter les changements récents de cycle de vie
 *
 * Routes disponibles :
 * - GET /lifecycle/identity/:identityId - Historique d'une identité
 * - GET /lifecycle/stats - Statistiques globales
 * - GET /lifecycle/states - Tous les états disponibles (avec cache)
 * - GET /lifecycle/states/custom - États personnalisés uniquement
 * - GET /lifecycle/recent - Changements récents
 *
 * @example
 * // Récupérer l'historique d'une identité
 * GET /api/lifecycle/identity/507f1f77bcf86cd799439011
 *
 * // Obtenir les statistiques
 * GET /api/lifecycle/stats
 */
@ApiTags('management/lifecycle')
@Controller('lifecycle')
@UseInterceptors(LifecycleCacheInterceptor)
export class LifecycleController extends AbstractController {
  /**
   * Constructeur du contrôleur lifecycle
   *
   * @param {LifecycleCrudService} _service - Service de gestion du cycle de vie injecté
   */
  public constructor(
    protected readonly _service: LifecycleCrudService,
  ) {
    super()
  }

  /**
   * Récupère l'historique du cycle de vie d'une identité
   *
   * @async
   * @param {Types.ObjectId} identityId - Identifiant MongoDB de l'identité
   * @param {Response} res - Objet de réponse Express
   * @param {FilterOptions} searchFilterOptions - Options de filtrage et pagination
   * @returns {Promise<Response<Lifecycle[]>>} Liste paginée des événements de cycle de vie
   *
   * @description Retourne tous les événements de cycle de vie associés à une identité
   * donnée, triés chronologiquement. Supporte la pagination et le filtrage via
   * les options de recherche. Utile pour tracer l'évolution complète d'un compte.
   *
   * @example
   * // Requête
   * GET /lifecycle/identity/507f1f77bcf86cd799439011?limit=10&page=1
   *
   * // Réponse
   * {
   *   statusCode: 200,
   *   data: [
   *     { _id: '...', lifecycle: 'OFFICIAL', date: '2025-01-01T00:00:00Z' },
   *     { _id: '...', lifecycle: 'MANUAL', date: '2025-03-15T00:00:00Z' }
   *   ],
   *   total: 2
   * }
   */
  @ApiOperation({ summary: 'Récupérer l\'historique du cycle de vie d\'une identité' })
  @ApiParam({ name: 'identityId', description: 'Identifiant de l\'identité' })
  @Get('identity/:identityId')
  public async getLifecycleHistory(
    @Param('identityId', ObjectIdValidationPipe) identityId: Types.ObjectId,
    @Res() res: Response,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response<Lifecycle[]>> {
    const [total, data] = await this._service.getLifecycleHistory(identityId, searchFilterOptions)

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
      total,
    })
  }

  /**
   * Récupère les statistiques globales du cycle de vie
   *
   * @async
   * @param {Response} res - Objet de réponse Express
   * @returns {Promise<Response<Lifecycle[]>>} Statistiques du cycle de vie
   *
   * @description Retourne des statistiques agrégées sur le cycle de vie des identités,
   * incluant le nombre d'identités par état, les transitions récentes, etc.
   * Utile pour les tableaux de bord et le monitoring global du système.
   *
   * @example
   * // Requête
   * GET /lifecycle/stats
   *
   * // Réponse
   * {
   *   statusCode: 200,
   *   data: {
   *     byState: { OFFICIAL: 1250, MANUAL: 340, ARCHIVED: 89 },
   *     recentTransitions: 45,
   *     ...
   *   }
   * }
   */
  @ApiOperation({ summary: 'Récupérer les statistiques du cycle de vie' })
  @Get('stats')
  public async getStats(
    @Res() res: Response,
  ): Promise<Response<Lifecycle[]>> {
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: await this._service.getLifecycleStats(),
    })
  }

  /**
   * Récupère tous les états de cycle de vie disponibles
   *
   * @async
   * @param {Request} req - Objet de requête Express
   * @param {Response} res - Objet de réponse Express
   * @returns {Promise<Response<Array<{ key: string; label: string; description: string }>>>} Liste des états disponibles
   *
   * @description Retourne la liste complète des états de cycle de vie incluant :
   * - Les états par défaut définis dans l'énumération IdentityLifecycleDefault
   * - Les états personnalisés chargés depuis le fichier de configuration states.yml
   *
   * Implémente un mécanisme de cache HTTP avec :
   * - ETag basé sur l'âge du fichier de configuration
   * - Last-Modified indiquant la dernière modification
   * - Cache-Control avec validation obligatoire (must-revalidate)
   * - Réponse 304 Not Modified si le cache client est à jour
   *
   * @example
   * // Requête
   * GET /lifecycle/states
   * Headers: { 'If-None-Match': '"1732617600000"' }
   *
   * // Réponse (si modifié)
   * {
   *   statusCode: 200,
   *   data: [
   *     { key: 'A', label: 'En Attente', description: 'Compte anticipé...' },
   *     { key: 'O', label: 'Officiel', description: 'Compte actif...' }
   *   ]
   * }
   *
   * // Réponse (si non modifié)
   * 304 Not Modified
   */
  @ApiOperation({
    summary: 'Récupérer tous les états de cycle de vie disponibles',
    description: 'Retourne tous les états de cycle de vie incluant les états par défaut et les états personnalisés de la configuration'
  })
  @Get('states')
  public async getAllStates(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response<Array<{ key: string; label: string; description: string }>>> {
    // Identifiant unique basé sur la dernière modification du fichier states.yml
    // Permet de déterminer si le cache client doit être invalidé
    const statesFileAge = this._service.stateFileAge;
    this.logger.debug(`Âge du fichier states.yml (ms depuis epoch) : ${statesFileAge}`)

    const etag = `"${statesFileAge}"`
    const ifNoneMatch = req.headers['if-none-match']
    res.setHeader('ETag', etag)
    res.setHeader('Last-Modified', new Date(statesFileAge).toUTCString())
    res.setHeader('Cache-Control', 'public, max-age=1, must-revalidate')

    if (ifNoneMatch === etag) {
      return res.status(HttpStatus.NOT_MODIFIED).send()
    }

    return res
      .status(HttpStatus.OK)
      .json({
        statusCode: HttpStatus.OK,
        data: this._service.getAllAvailableStates(),
      })
  }

  /**
   * Récupère uniquement les états personnalisés du cycle de vie
   *
   * @async
   * @param {Response} res - Objet de réponse Express
   * @returns {Promise<Response<Array<{ key: string; label: string; description: string }>>>} Liste des états personnalisés
   *
   * @description Retourne uniquement les états de cycle de vie personnalisés
   * chargés depuis le fichier de configuration states.yml, excluant les états
   * par défaut de l'énumération. Utile pour afficher ou gérer uniquement
   * la configuration personnalisée du système.
   *
   * @example
   * // Requête
   * GET /lifecycle/states/custom
   *
   * // Réponse
   * {
   *   statusCode: 200,
   *   data: [
   *     { key: 'C', label: 'Custom State', description: 'État personnalisé...' }
   *   ]
   * }
   */
  @ApiOperation({
    summary: 'Récupérer les états personnalisés du cycle de vie',
    description: 'Retourne uniquement les états personnalisés chargés depuis le fichier de configuration states.yml'
  })
  @Get('states/custom')
  public async getCustomStates(
    @Res() res: Response,
  ): Promise<Response<Array<{ key: string; label: string; description: string }>>> {
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this._service.getCustomStates(),
    })
  }

  /**
   * Récupère les changements récents du cycle de vie
   *
   * @async
   * @param {FilterOptions} searchFilterOptions - Options de filtrage et pagination
   * @param {Response} res - Objet de réponse Express
   * @returns {Promise<Response<Lifecycle[]>>} Liste paginée des changements récents
   *
   * @description Retourne les événements de cycle de vie les plus récents
   * sur l'ensemble du système, triés par date décroissante. Supporte la pagination
   * et le filtrage. Utile pour le monitoring en temps réel des transitions d'état
   * et l'audit des modifications.
   *
   * @example
   * // Requête
   * GET /lifecycle/recent?limit=20&page=1
   *
   * // Réponse
   * {
   *   statusCode: 200,
   *   data: [
   *     {
   *       _id: '...',
   *       refId: '507f1f77bcf86cd799439011',
   *       lifecycle: 'MANUAL',
   *       date: '2025-11-26T10:00:00Z'
   *     },
   *     ...
   *   ],
   *   total: 156
   * }
   */
  @ApiOperation({ summary: 'Récupérer les changements récents du cycle de vie' })
  @Get('recent')
  public async getRecentChanges(
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
    @Res() res: Response,
  ): Promise<Response<Lifecycle[]>> {
    const [total, data] = await this._service.getRecentChanges(searchFilterOptions);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
      total,
    })
  }
}
