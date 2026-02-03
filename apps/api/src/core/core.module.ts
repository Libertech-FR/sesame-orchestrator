import { DynamicModule, Module } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'
import { AgentsModule } from './agents/agents.module'
import { AuthModule } from './auth/auth.module'
import { BackendsModule } from './backends/backends.module'
import { CoreController } from './core.controller'
import { CoreService } from './core.service'
import { JobsModule } from './jobs/jobs.module'
import { KeyringsModule } from './keyrings/keyrings.module'
import { LoggerModule } from './logger/logger.module'
import { TasksModule } from './tasks/tasks.module'
import { FilestorageModule } from './filestorage/filestorage.module'
import { AuditsModule } from './audits/audits.module'
import { HealthModule } from './health/health.module'
import { CronModule } from './cron/cron.module'

/**
 * Module Core - Fonctionnalités essentielles du système.
 *
 * Ce module regroupe tous les sous-modules et fonctionnalités de base nécessaires
 * au fonctionnement de l'orchestrateur Sesame. Il agit comme un hub central qui
 * organise et expose les API des différents composants du système.
 *
 * @module CoreModule
 *
 * @description
 * Sous-modules intégrés :
 * - **AuthModule** : Authentification et autorisation des agents
 * - **AgentsModule** : Gestion des agents (utilisateurs/systèmes)
 * - **AuditsModule** : Système d'audit et d'historique des modifications
 * - **BackendsModule** : Gestion des backends de connexion
 * - **LoggerModule** : Système de logging centralisé
 * - **KeyringsModule** : Gestion des clés cryptographiques
 * - **JobsModule** : Gestion des tâches asynchrones et files d'attente
 * - **TasksModule** : Gestion des tâches planifiées
 * - **FilestorageModule** : Stockage et gestion de fichiers
 * - **HealthModule** : Vérification de l'état de santé du système
 * - **CronModule** : Gestion des tâches planifiées (cron)
 *
 * Architecture :
 * - Tous les sous-modules sont automatiquement préfixés avec '/core' dans les routes
 * - Utilise le RouterModule pour organiser la hiérarchie des routes
 * - Expose un service CoreService pour la logique transversale
 */
@Module({
  imports: [
    AuthModule,
    BackendsModule,
    LoggerModule,
    KeyringsModule,
    AgentsModule,
    JobsModule,
    TasksModule,
    FilestorageModule,
    AuditsModule,
    HealthModule,
    CronModule,
  ],
  providers: [CoreService],
  controllers: [CoreController],
})
export class CoreModule {
  /**
   * Enregistre le module Core en mode dynamique avec le routage configuré.
   *
   * Cette méthode configure automatiquement le préfixe '/core' pour tous les
   * sous-modules importés, créant une hiérarchie de routes cohérente.
   *
   * @static
   * @returns {DynamicModule} Le module configuré avec le RouterModule
   *
   * @description
   * La méthode utilise les métadonnées de réflexion pour récupérer dynamiquement
   * tous les modules importés et les enregistrer comme enfants de la route '/core'.
   * Cela permet d'ajouter ou retirer des sous-modules sans modifier la configuration
   * de routage manuellement.
   */
  public static register(): DynamicModule {
    return {
      module: this,
      imports: [
        RouterModule.register([
          {
            path: 'core',
            children: [...Reflect.getMetadata('imports', this)],
          },
        ]),
      ],
    };
  }
}
