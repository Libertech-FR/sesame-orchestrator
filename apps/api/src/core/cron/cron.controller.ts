
import { Controller, Post, Body, Get, Res, HttpStatus } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CronService } from './cron.service'
import { Public } from '~/_common/decorators/public.decorator'
import { Response } from 'express'

/**
 * Contrôleur Cron - Endpoints pour les tâches planifiées.
 *
 * Permet de déclencher manuellement certaines tâches cron à des fins de test ou d'administration.
 */
@ApiTags('cron')
@Controller('cron')
@Public()
export class CronController {
  public constructor(private readonly cronService: CronService) { }

  @Get()
  public async search(@Res() res: Response): Promise<Response> {
    const [data, total] = await this.cronService.search()
    return res.json({
      statusCode: HttpStatus.OK,
      data,
      total,
    })
  }
}
