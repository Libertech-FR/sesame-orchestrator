import { DynamicModule, Logger, Module, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'
import serviceSetup from '~/extensions/extensions.service.setup'

/**
 * Module de gestion et de chargement des extensions.
 *
 * Ce module gère le système de plugins/extensions de l'application, permettant
 * de charger dynamiquement des modules personnalisés qui enrichissent les
 * fonctionnalités sans modifier le code source principal. Les extensions sont
 * chargées au démarrage selon la configuration définie dans list.yml.
 *
 * @module ExtensionsModule
 * @implements {OnModuleInit}
 * @implements {OnApplicationBootstrap}
 *
 * @description
 * Fonctionnalités du système d'extensions :
 * - Chargement dynamique des modules d'extension au démarrage
 * - Isolation des extensions dans leurs propres modules
 * - Configuration centralisée via list.yml et extension.yml
 * - Support des extensions côté service (backend) et application (frontend)
 * - Activation/désactivation des extensions sans suppression
 * - Routage automatique sous le préfixe '/extensions'
 *
 * Comportement selon le contexte :
 * - **Mode service** : Charge toutes les extensions activées depuis list.yml
 * - **Mode console** : Ignore le chargement des extensions pour optimiser les performances
 *
 * Processus de chargement :
 * 1. Lecture du fichier list.yml
 * 2. Filtrage des extensions activées
 * 3. Chargement de chaque extension.yml
 * 4. Import dynamique des modules définis
 * 5. Enregistrement des routes sous '/extensions'
 */
@Module({
  imports: [],
})
export class ExtensionsModule implements OnModuleInit, OnApplicationBootstrap {
  /**
   * Hook de cycle de vie appelé après l'initialisation du module.
   *
   * Enregistre un message de log confirmant que toutes les extensions
   * ont été initialisées avec succès.
   *
   * @async
   * @returns {Promise<void>}
   */
  public async onModuleInit(): Promise<void> {
    Logger.log('All extensions is initialized', ExtensionsModule.name)
  }

  /**
   * Hook de cycle de vie appelé après le démarrage complet de l'application.
   *
   * Enregistre un message de log confirmant que toutes les extensions
   * ont été enregistrées et sont prêtes à être utilisées.
   *
   * @async
   * @returns {Promise<void>}
   */
  public async onApplicationBootstrap(): Promise<void> {
    Logger.log('Extensions registered !', ExtensionsModule.name)
  }

  /**
   * Enregistre le module Extensions en mode dynamique avec chargement des extensions.
   *
   * Cette méthode asynchrone charge dynamiquement toutes les extensions activées
   * depuis le fichier de configuration list.yml et configure le routage automatique.
   *
   * @static
   * @async
   * @returns {Promise<DynamicModule>} Le module configuré avec les extensions chargées
   *
   * @description
   * Processus détaillé :
   * 1. Vérifie si l'application est lancée en mode console
   *    - Si oui : Ignore le chargement des extensions (retour module vide)
   *    - Si non : Continue le chargement
   * 2. Appelle serviceSetup() qui :
   *    - Lit le fichier list.yml
   *    - Charge chaque extension activée
   *    - Import dynamiquement les modules
   * 3. Configure le RouterModule pour préfixer toutes les routes par '/extensions'
   * 4. Retourne le module dynamique avec toutes les extensions importées
   *
   * Logging :
   * - Mode console : Log verbose indiquant que les extensions sont ignorées
   * - Mode service : Log debug au début du chargement
   * - Fin d'initialisation : Log info via onModuleInit()
   */
  public static async register(): Promise<DynamicModule> {
    const modules = await serviceSetup()

    return {
      module: this,
      imports: [
        ...modules,
        RouterModule.register([
          {
            path: 'extensions',
            children: [...Reflect.getMetadata('imports', this)],
          },
        ]),
      ],
    }
  }
}
