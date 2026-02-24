
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
}
