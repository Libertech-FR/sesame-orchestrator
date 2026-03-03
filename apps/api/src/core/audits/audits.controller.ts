import { Controller, Get, HttpStatus, Param, Query, Res } from '@nestjs/common'
import { AbstractController } from '~/_common/abstracts/abstract.controller'
import { ApiTags } from '@nestjs/swagger'
import { PartialProjectionType } from '~/_common/types/partial-projection.type'
import { AuditsService } from '~/core/audits/audits.service'
import { UseRoles } from '~/_common/decorators/use-roles.decorator'
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types'
import { FilterOptions, FilterSchema, SearchFilterOptions, SearchFilterSchema } from '~/_common/restools'
import { Response } from 'express'
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe'
import { Types } from 'mongoose'

/**
 * Contrôleur pour la gestion des audits et de l'historique des enregistrements.
 *
 * Ce contrôleur expose les endpoints API REST permettant de consulter l'historique
 * des modifications enregistrées automatiquement par le plugin Mongoose, ainsi que
 * d'effectuer des opérations de restauration et de suppression d'entrées d'audit.
 *
 * @class AuditsController
 * @extends {AbstractController}
 *
 * Cas d'usage typiques :
 * - Consulter l'historique complet des modifications d'un enregistrement
 * - Auditer les actions effectuées par les utilisateurs
 * - Effectuer un rollback pour restaurer une version antérieure
 * - Nettoyer les audits obsolètes pour optimiser l'espace de stockage
 */
@ApiTags('core/audits')
@Controller('audits')
export class AuditsController extends AbstractController {
  /**
   * Configuration de la projection pour limiter les champs retournés.
   * Par défaut, tous les champs sont retournés (projection vide).
   */
  protected static readonly projection: PartialProjectionType<any> = {
    coll: 1,
    documentId: 1,
    op: 1,
    agent: 1,
    'changes.path': 1,
    'changes.type': 1,
    metadata: 1,
  }

  protected static readonly detailProjection: PartialProjectionType<any> = {
    coll: 1,
    documentId: 1,
    op: 1,
    agent: 1,
    changes: 1,
    metadata: 1,
  }

  protected static readonly searchFields: PartialProjectionType<any> = {
    coll: 1,
    documentId: 1,
    op: 1,
    'agent.name': 1,
    'changes.path': 1,
    'changes.value': 1,
    'changes.oldValue': 1,
  }

  /**
   * Constructeur du contrôleur AuditsController.
   *
   * @param {AuditsService} _service - Le service de gestion des audits
   */
  public constructor(private readonly _service: AuditsService) {
    super()
  }

  @Get('collections')
  @UseRoles({
    resource: '/core/audits',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  public async collections(@Res() res: Response): Promise<Response> {
    const data = await this._service.getCollections()
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    })
  }

  @Get()
  @UseRoles({
    resource: '/core/audits',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  public async search(
    @Res() res: Response,
    @Query('search') search: string,
    @Query('coll') coll: string,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response> {
    const searchFilter = {}

    if (search && search.trim().length > 0) {
      const searchRequest = {}
      searchRequest['$or'] = Object.keys(AuditsController.searchFields).map((key) => {
        return { [key]: { $regex: `^${search}`, $options: 'i' } }
      }).filter((item) => item !== undefined)
      searchFilter['$and'] = [searchRequest]
      searchFilter['$and'].push(searchFilterSchema)
    } else {
      Object.assign(searchFilter, searchFilterSchema)
    }

    if (coll && coll.trim().length > 0) {
      searchFilter['coll'] = coll.trim()
    }

    const [data, total] = await this._service.findAndCount(searchFilter, AuditsController.projection, searchFilterOptions)
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    })
  }

  @Get(':coll/:documentId')
  @UseRoles({
    resource: '/core/audits',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  public async searchByDocumentId(
    @Param('coll') coll: string,
    @Param('documentId', ObjectIdValidationPipe) documentId: Types.ObjectId,
    @Res() res: Response,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response> {
    const [data, total] = await this._service.findAndCount(
      {
        coll,
        documentId,
      } as any,
      AuditsController.projection,
      searchFilterOptions,
    )
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    })
  }

  @Get(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/core/audits',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  public async read(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.findById(_id, AuditsController.detailProjection)
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    })
  }
}
