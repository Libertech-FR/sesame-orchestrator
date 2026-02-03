
import { Controller, Post, Body } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CronService } from './cron.service'

/**
 * Contrôleur Cron - Endpoints pour les tâches planifiées.
 *
 * Permet de déclencher manuellement certaines tâches cron à des fins de test ou d'administration.
 */
@ApiTags('cron')
@Controller('cron')
export class CronController {
  constructor(private readonly cronService: CronService) { }

}
