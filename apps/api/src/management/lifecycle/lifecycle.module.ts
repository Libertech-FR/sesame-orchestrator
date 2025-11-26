import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Lifecycle, LifecycleSchema } from './_schemas/lifecycle.schema'
import { LifecycleController } from './lifecycle.controller'
import { LifecycleService } from './lifecycle.service'
import { IdentitiesModule } from '../identities/identities.module'
import { useOnCli } from '~/_common/functions/is-cli'
import { LifecycleCommand } from './lifecycle.command'
import { BackendsModule } from '~/core/backends/backends.module'

/**
 * Module de gestion du cycle de vie des identités
 *
 * @class LifecycleModule
 * @description Module NestJS centralisé pour la gestion complète du cycle de vie.
 *
 * Fonctionnalités principales :
 * - Gestion de l'historique des événements de cycle de vie
 * - Configuration et récupération des états disponibles
 * - Statistiques et rapports sur les transitions d'état
 * - Commandes CLI pour l'administration
 * - API REST pour l'intégration frontend
 */
@Module({
  imports: [
    // Enregistrement du modèle Mongoose pour les événements de cycle de vie
    MongooseModule.forFeature([
      {
        name: Lifecycle.name,
        schema: LifecycleSchema,
      },
    ]),
    // Module des backends pour l'accès aux sources de données
    BackendsModule,
    // Module des identités pour la gestion des comptes
    IdentitiesModule,
  ],
  providers: [
    // Service principal de gestion du cycle de vie
    LifecycleService,
    // Commandes CLI enregistrées uniquement en mode console
    ...useOnCli([
      ...LifecycleCommand.registerWithSubCommands(),
    ]),
  ],
  // Contrôleur REST exposant les endpoints API
  controllers: [LifecycleController],
  // Service exporté pour utilisation dans d'autres modules
  exports: [LifecycleService],
})
export class LifecycleModule { }
