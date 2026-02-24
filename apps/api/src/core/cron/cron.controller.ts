
import { Controller, Get, Res, HttpStatus, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CronService } from './cron.service'
import { Response } from 'express'

/**
 * Contrôleur Cron - Endpoints pour les tâches planifiées.
 *
 * Permet de déclencher manuellement certaines tâches cron à des fins de test ou d'administration.
 */
@ApiTags('cron')
@Controller('cron')
export class CronController {
  public constructor(private readonly cronService: CronService) { }

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
  public async read(
    @Res() res: Response,
  ): Promise<Response> {
    return res.json({
      statusCode: HttpStatus.OK,
    })
  }
}
