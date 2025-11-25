import { CommandFactory } from 'nest-commander'
import configInstance from '~/config'
import { CONSOLE_LOG_LEVEL } from './_common/functions/get-log-level'
import { AppModule } from './app.module'
import { InternalLogger } from './core/logger/internal.logger'

/**
 * Point d'entrée de l'interface en ligne de commande (CLI) de l'application.
 *
 * Cette fonction asynchrone auto-exécutée initialise et démarre l'application
 * en mode console pour exécuter des commandes CLI définies via nest-commander.
 *
 * @async
 * @function
 * @returns {Promise<void>}
 *
 * @description
 * Processus de démarrage :
 * 1. Charge la configuration de l'application
 * 2. Initialise le logger avec un niveau minimal (CONSOLE_LOG_LEVEL)
 * 3. Log le démarrage de la CLI avec le niveau de log configuré
 * 4. Crée l'application via CommandFactory sans fermeture automatique
 * 5. Configure un gestionnaire d'erreurs personnalisé
 * 6. Ferme proprement l'application après exécution
 * 7. Gère les erreurs critiques avec code de sortie approprié
 *
 * Codes de sortie :
 * - 0 : Exécution réussie
 * - 1 : Erreur lors de l'exécution d'une commande
 * - 255 : Erreur critique lors de l'initialisation
 *
 * @example
 * ```bash
 * # Exécution d'une commande CLI
 * yarn run console agents:create
 *
 * # La fonction initialise automatiquement l'application
 * # et exécute la commande spécifiée
 * ```
 *
 * @throws {Error} Erreur fatale capturée et loggée avec code de sortie 255
 */
(async () => {
  try {
    const cfg = configInstance();
    const logger = new InternalLogger({
      logLevel: CONSOLE_LOG_LEVEL, // Silencieux au démarrage des commandes console
      mongoose: cfg?.mongoose,
    });
    logger.log(`Starting CLI with log level <${cfg?.application?.logLevel || 'info'}>`)
    const app = await CommandFactory.runWithoutClosing(AppModule, {
      logger,
      errorHandler: (err) => {
        console.error(err)
        process.exit(1)
      },
    })
    await app.close()
  } catch (err) {
    console.error(err)
    process.exit(255)
  }
  process.exit(0)
})()
