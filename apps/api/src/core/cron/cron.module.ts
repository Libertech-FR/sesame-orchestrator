import { Module } from '@nestjs/common';
import './cron-console-handlers.bootstrap';
import { AgentsModule } from '~/core/agents/agents.module';
import { CronService } from './cron.service';
import { CronController } from './cron.controller';
import { CronHooksService } from './cron-hooks.service';
import { CronGateway } from './cron.gateway';
import { CronLogsStreamService } from './cron-logs-stream.service';

/**
 * Module Cron - Gestion des tâches planifiées (cron).
 *
 * Ce module orchestre l'exécution des tâches planifiées, telles que le nettoyage périodique,
 * en s'appuyant sur la configuration YAML et la persistance MongoDB.
 */
@Module({
  imports: [AgentsModule],
  controllers: [CronController],
  providers: [CronService, CronHooksService, CronLogsStreamService, CronGateway],
  exports: [CronService, CronHooksService],
})
export class CronModule {}
