
import { Module } from '@nestjs/common'
import { CronService } from './cron.service'
import { CronController } from './cron.controller'
import { CronHooksService } from './cron-hooks.service'

/**
 * Module Cron - Gestion des tâches planifiées (cron).
 *
 * Ce module orchestre l'exécution des tâches planifiées, telles que le nettoyage périodique,
 * en s'appuyant sur la configuration YAML et la persistance MongoDB.
 */
@Module({
  controllers: [CronController],
  providers: [CronService, CronHooksService],
  exports: [
    CronService,
    CronHooksService,
  ],
})
export class CronModule { }
