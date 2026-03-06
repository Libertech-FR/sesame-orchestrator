
import { Controller, Get, Res, HttpStatus, Query, Param, DefaultValuePipe, ParseIntPipe, NotFoundException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CronService } from './cron.service'
import { Response } from 'express'
import { UseRoles } from '~/_common/decorators/use-roles.decorator'
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types'
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator'
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper'
import { CronDto } from './_dto/cron.dto'
import { PartialProjectionType } from '~/_common/types/partial-projection.type'
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator'

/**
 * Contrôleur Cron - Endpoints pour les tâches planifiées.
 *
 * Permet de déclencher manuellement certaines tâches cron à des fins de test ou d'administration.
 */
@ApiTags('cron')
@Controller('cron')
export class CronController {
  public constructor(private readonly cronService: CronService) { }

  protected static readonly projection: PartialProjectionType<CronDto> = {
    name: 1,
    description: 1,
    schedule: 1,
  }

  /**
   * Endpoint pour rechercher et lister les tâches cron configurées.
   *
   * @param search Recherche par nom ou description de la tâche cron
   * @param page Numéro de page pour la pagination
   * @param limit Nombre d'éléments par page pour la pagination
   * @param res Objet de réponse Express pour envoyer la réponse HTTP
   * @returns Une liste paginée des tâches cron avec leurs détails d'exécution
   */
  @Get()
  @UseRoles({
    resource: '/core/cron',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiPaginatedDecorator(PickProjectionHelper(CronDto, CronController.projection))
  public async search(
    @Query('search') search: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Res() res: Response,
  ): Promise<Response> {
    const [data, total] = await this.cronService.search(search, {
      page,
      limit,
    })

    return res.json({
      statusCode: HttpStatus.OK,
      data,
      total,
    })
  }

  @Get(':name')
  @UseRoles({
    resource: '/core/cron',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiReadResponseDecorator(CronDto)
  public async read(
    @Param('name') name: string,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this.cronService.read(name)
    if (!data) {
      throw new NotFoundException(`Cron task <${name}> not found`)
    }

    return res.json({
      statusCode: HttpStatus.OK,
      data,
    })
  }

  @Get(':name/logs')
  @UseRoles({
    resource: '/core/cron',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  public async readLogs(
    @Param('name') name: string,
    @Query('tail', new DefaultValuePipe(500), ParseIntPipe) tail: number,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this.cronService.readLogs(name, tail)

    return res.json({
      statusCode: HttpStatus.OK,
      data,
    })
  }
}
