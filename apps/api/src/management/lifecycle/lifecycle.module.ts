import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Lifecycle, LifecycleSchema } from './_schemas/lifecycle.schema'
import { LifecycleController } from './lifecycle.controller'
import { LifecycleCrudService } from './lifecycle-crud.service'
import { LifecycleHooksService } from './lifecycle-hooks.service'
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
 * - Automatisations et règles de transition (LifecycleHooksService)
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
    // Service CRUD de gestion du cycle de vie
    LifecycleCrudService,
    // Service de gestion des automatisations et événements
    LifecycleHooksService,
    // Commandes CLI enregistrées uniquement en mode console
    ...useOnCli([
      ...LifecycleCommand.registerWithSubCommands(),
    ]),
  ],
  // Contrôleur REST exposant les endpoints API
  controllers: [LifecycleController],
  // Services exportés pour utilisation dans d'autres modules
  exports: [LifecycleCrudService, LifecycleHooksService],
})
export class LifecycleModule { }
