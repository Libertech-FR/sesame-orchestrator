import { Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { Command, CommandRunner, InquirerService, SubCommand } from 'nest-commander'
import { LifecycleCrudService } from './lifecycle-crud.service'
import { LifecycleHooksService } from './lifecycle-hooks.service'

/**
 * Commande CLI pour lister les sources de cycle de vie
 *
 * @class LifecycleListCommand
 * @extends CommandRunner
 * @description Sous-commande permettant d'afficher la liste complète des sources
 * de cycle de vie configurées et leurs actions associées. Affiche les résultats
 * sous forme de tableau dans la console.
 *
 * @example
 * // Utilisation en ligne de commande
 * yarn run console lifecycle list
 */
@SubCommand({ name: 'list' })
export class LifecycleListCommand extends CommandRunner {
  private readonly logger = new Logger(LifecycleListCommand.name)

  /**
   * Constructeur de la commande list
   *
   * @param {ModuleRef} moduleRef - Référence au module NestJS pour la résolution de dépendances
   * @param {InquirerService} inquirer - Service pour les interactions utilisateur en ligne de commande
   * @param {LifecycleCrudService} lifecycleService - Service de gestion du cycle de vie
   */
  public constructor(
    protected moduleRef: ModuleRef,
    private readonly inquirer: InquirerService,
    private readonly lifecycleService: LifecycleCrudService,
  ) {
    super()
  }

  /**
   * Exécute la commande de listage des sources de cycle de vie
   *
   * @async
   * @param {string[]} inputs - Arguments d'entrée de la commande
   * @param {any} options - Options de la commande
   * @returns {Promise<void>}
   *
   * @description Récupère toutes les sources de cycle de vie configurées
   * et affiche leurs actions sous forme de tableau. Pour chaque source,
   * affiche un titre suivi de la liste de ses actions. Si aucune action
   * n'est trouvée pour une source, affiche un avertissement.
   *
   * @example
   * // Sortie console typique :
   * // === Lifecycle Source: identities ===
   * // ┌─────────┬──────────────┬──────────┬──────────┐
   * // │ (index) │ sources      │ trigger  │ target   │
   * // ├─────────┼──────────────┼──────────┼──────────┤
   * // │    0    │ ['OFFICIAL'] │ 7776000  │ 'MANUAL' │
   * // └─────────┴──────────────┴──────────┴──────────┘
   */
  async run(inputs: string[], options: any): Promise<void> {
    this.logger.log('Démarrage de la commande de listage des cycles de vie...')

    const lifecycles = await this.lifecycleService.listLifecycleSources()

    Object.entries(lifecycles).forEach(([source, actions]) => {
      this.logger.log(`=== Source de cycle de vie : ${source} ===`)
      if (actions && Array.isArray(actions) && actions.length > 0) {
        console.table(actions)
      } else {
        this.logger.warn('Aucune action de cycle de vie trouvée.')
      }
    });
  }
}

@SubCommand({ name: 'execute' })
export class LifecycleExecuteCommand extends CommandRunner {
  private readonly logger = new Logger(LifecycleExecuteCommand.name)

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly inquirer: InquirerService,
    private readonly lifecycleService: LifecycleCrudService,
    private readonly lifecycleHooksService: LifecycleHooksService,
  ) {
    super()
  }

  async run(inputs: string[], options: any): Promise<void> {
    this.logger.log('Démarrage de la commande d\'exécution du cycle de vie...')

    const source = inputs[0]
    if (!source) {
      this.logger.log('Aucune source de cycle de vie spécifiée. Exécution pour toutes les sources...')

      try {
        await this.lifecycleHooksService.executeCronForAllSources()
        this.logger.log(`Exécution du cycle de vie pour toutes les sources terminée avec succès.`)
      } catch (error) {
        this.logger.error(`Erreur lors de l'exécution du cycle de vie pour toutes les sources: ${error.message}`)
      }
      return
    }

    try {
      await this.lifecycleHooksService.executeCronForSource(source)
      this.logger.log(`Exécution du cycle de vie pour la source '${source}' terminée avec succès.`)
    } catch (error) {
      this.logger.error(`Erreur lors de l'exécution du cycle de vie pour la source '${source}': ${error.message}`)
    }
  }
}

/**
 * Commande CLI principale pour la gestion du cycle de vie
 *
 * @class LifecycleCommand
 * @extends CommandRunner
 * @description Commande racine pour toutes les opérations liées au cycle de vie.
 * Sert de point d'entrée pour les sous-commandes comme 'list'. Ne possède pas
 * de logique propre mais délègue aux sous-commandes enregistrées.
 *
 * Configuration :
 * - name: 'lifecycle' - Nom de la commande
 * - arguments: '<task>' - Argument requis spécifiant la tâche à exécuter
 * - subCommands: [LifecycleListCommand, LifecycleExecuteCommand] - Liste des sous-commandes disponibles
 *
 * @example
 * // Utilisation en ligne de commande
 * yarn run console lifecycle list
 * yarn run console lifecycle <autre-sous-commande>
 */
@Command({ name: 'lifecycle', arguments: '<task>', subCommands: [LifecycleListCommand, LifecycleExecuteCommand] })
export class LifecycleCommand extends CommandRunner {
  /**
   * Constructeur de la commande lifecycle
   *
   * @param {ModuleRef} moduleRef - Référence au module NestJS pour la résolution de dépendances
   */
  public constructor(protected moduleRef: ModuleRef) {
    super()
  }

  /**
   * Méthode d'exécution principale
   *
   * @async
   * @param {string[]} inputs - Arguments d'entrée de la commande
   * @param {any} options - Options de la commande
   * @returns {Promise<void>}
   *
   * @description Méthode vide car la commande principale délègue toute la logique
   * aux sous-commandes. Cette méthode est appelée uniquement si aucune sous-commande
   * valide n'est spécifiée.
   */
  async run(inputs: string[], options: any): Promise<void> { }
}
