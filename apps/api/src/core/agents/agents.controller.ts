import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res } from '@nestjs/common'
import { ApiParam, ApiTags } from '@nestjs/swagger'
import {
  FilterOptions,
  FilterSchema,
  SearchFilterOptions,
  SearchFilterSchema,
} from '~/_common/restools'
import { Response } from 'express'
import { Types } from 'mongoose'
import { AbstractController } from '~/_common/abstracts/abstract.controller'
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator'
import { ApiDeletedResponseDecorator } from '~/_common/decorators/api-deleted-response.decorator'
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator'
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator'
import { ApiUpdateDecorator } from '~/_common/decorators/api-update.decorator'
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper'
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe'
import { PartialProjectionType } from '~/_common/types/partial-projection.type'
import { AgentsCreateDto, AgentsDto, AgentsUpdateDto } from '~/core/agents/_dto/agents.dto'
import { AgentsService } from './agents.service'

/**
 * Contrôleur pour la gestion des agents
 *
 * Ce contrôleur fournit les endpoints REST pour gérer les agents du système,
 * incluant la création, la recherche, la lecture, la mise à jour et la suppression.
 *
 * @class AgentsController
 * @extends {AbstractController}
 */
@ApiTags('core/agents')
@Controller('agents')
export class AgentsController extends AbstractController {
  /**
   * Projection des champs retournés pour les opérations de recherche
   *
   * Définit les propriétés de l'agent qui seront incluses dans les réponses
   * des requêtes de recherche et de liste.
   *
   * @protected
   * @static
   * @readonly
   * @type {PartialProjectionType<AgentsDto>}
   */
  protected static readonly projection: PartialProjectionType<AgentsDto> = {
    // entityId: 1,
    username: 1,
    displayName: 1,
    email: 1,
    state: 1,
    hidden: 1,
  }

  protected static readonly searchFields: PartialProjectionType<any> = {
    username: 1,
    displayName: 1,
    email: 1,
  };

  /**
   * Constructeur du contrôleur agents
   *
   * @param {AgentsService} _service - Service de gestion des agents injecté par dépendance
   */
  public constructor(private readonly _service: AgentsService) {
    super()
  }

  /**
   * Crée un nouvel agent
   *
   * Endpoint POST permettant de créer un nouvel agent dans le système.
   *
   * @async
   * @param {Response} res - Objet de réponse Express
   * @param {AgentsCreateDto} body - Données de création de l'agent
   * @returns {Promise<Response>} Réponse HTTP avec l'agent créé et le code 201
   * @throws {BadRequestException} Si les données fournies sont invalides
   */
  @Post()
  @ApiCreateDecorator(AgentsCreateDto, AgentsDto)
  public async create(@Res() res: Response, @Body() body: AgentsCreateDto): Promise<Response> {
    const data = await this._service.create(body)
    return res.status(HttpStatus.CREATED).json({
      statusCode: HttpStatus.CREATED,
      data,
    })
  }

  /**
   * Recherche et liste les agents avec pagination
   *
   * Endpoint GET permettant de rechercher et filtrer les agents avec support
   * de la pagination, du tri et des filtres avancés.
   *
   * @async
   * @param {Response} res - Objet de réponse Express
   * @param {FilterSchema} searchFilterSchema - Schéma de filtres de recherche
   * @param {FilterOptions} searchFilterOptions - Options de pagination et tri
   * @returns {Promise<Response>} Réponse HTTP avec la liste paginée des agents et le total
   * @todo Implémenter la recherche arborescente par parentId
   */
  @Get()
  @ApiPaginatedDecorator(PickProjectionHelper(AgentsDto, AgentsController.projection))
  public async search(
    @Res() res: Response,
    @Query('search') search: string,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response> {

    const searchFilter = {}

    if (search && search.trim().length > 0) {
      const searchRequest = {}
      searchRequest['$or'] = Object.keys(AgentsController.searchFields).map((key) => {
        return { [key]: { $regex: `^${search}`, $options: 'i' } }
      }).filter(item => item !== undefined)
      searchFilter['$and'] = [searchRequest]
      searchFilter['$and'].push(searchFilterSchema)
    } else {
      Object.assign(searchFilter, searchFilterSchema)
    }

    const [data, total] = await this._service.findAndCount(
      searchFilter,
      AgentsController.projection,
      searchFilterOptions,
    )
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    })
  }

  /**
   * Récupère un agent par son identifiant
   *
   * Endpoint GET permettant de récupérer les détails complets d'un agent spécifique.
   * Les champs sensibles (password, security) sont exclus de la réponse.
   *
   * @async
   * @param {Types.ObjectId} _id - Identifiant MongoDB de l'agent (24 caractères hexadécimaux)
   * @param {Response} res - Objet de réponse Express
   * @returns {Promise<Response>} Réponse HTTP avec les données de l'agent
   * @throws {NotFoundException} Si l'agent n'est pas trouvé
   */
  @Get(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiReadResponseDecorator(AgentsDto)
  public async read(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.findById(_id, {
      password: 0,
      security: 0,
    })
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    })
  }

  /**
   * Met à jour un agent existant
   *
   * Endpoint PATCH permettant de modifier partiellement les données d'un agent.
   * Seuls les champs fournis dans le body seront mis à jour.
   *
   * @async
   * @param {Types.ObjectId} _id - Identifiant MongoDB de l'agent (24 caractères hexadécimaux)
   * @param {AgentsUpdateDto} body - Données de mise à jour de l'agent
   * @param {Response} res - Objet de réponse Express
   * @returns {Promise<Response>} Réponse HTTP avec l'agent mis à jour
   * @throws {NotFoundException} Si l'agent n'est pas trouvé
   * @throws {BadRequestException} Si les données fournies sont invalides
   */
  @Patch(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiUpdateDecorator(AgentsUpdateDto, AgentsDto)
  public async update(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: AgentsUpdateDto,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.update(_id, body)
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    })
  }

  /**
   * Supprime un agent
   *
   * Endpoint DELETE permettant de supprimer un agent du système.
   *
   * @async
   * @param {Types.ObjectId} _id - Identifiant MongoDB de l'agent (24 caractères hexadécimaux)
   * @param {Response} res - Objet de réponse Express
   * @returns {Promise<Response>} Réponse HTTP avec les données de l'agent supprimé
   * @throws {NotFoundException} Si l'agent n'est pas trouvé
   */
  @Delete(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiDeletedResponseDecorator(AgentsDto)
  public async remove(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.delete(_id)
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    })
  }
}
