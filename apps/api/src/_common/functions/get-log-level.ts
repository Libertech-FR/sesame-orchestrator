import { LogLevel } from '@nestjs/common'

/**
 * Retourne un tableau de niveaux de log NestJS basé sur le niveau spécifié.
 *
 * Cette fonction implémente une hiérarchie de log cumulative où chaque niveau
 * inclut automatiquement tous les niveaux plus critiques. Par exemple, le niveau
 * "warn" inclura également "error" et "fatal".
 *
 * @param {string} [logLevel] - Niveau de log souhaité ('fatal', 'error', 'warn', 'info', 'debug', 'verbose')
 * @returns {LogLevel[]} Tableau des niveaux de log activés pour ce niveau
 *
 * @description
 * Hiérarchie des niveaux (du plus critique au plus verbeux) :
 * - fatal: Erreurs critiques uniquement
 * - error: Erreurs (error + fatal)
 * - warn: Avertissements (warn + error + fatal)
 * - info: Informations (log + warn + error + fatal)
 * - debug: Debug (debug + log + warn + error + fatal)
 * - verbose: Tout (verbose + debug + log + warn + error + fatal)
 *
 * Si aucun niveau n'est spécifié ou si le niveau est invalide, retourne 'info' par défaut.
 *
 * @example
 * ```typescript
 * // Configuration du logger avec niveau warn
 * const levels = getLogLevel('warn');
 * // Retourne: ['error', 'fatal', 'warn']
 *
 * // Configuration du logger avec niveau debug
 * const levels = getLogLevel('debug');
 * // Retourne: ['error', 'fatal', 'warn', 'log', 'debug']
 *
 * // Niveau invalide ou non spécifié
 * const levels = getLogLevel();
 * // Retourne: ['error', 'fatal', 'warn', 'log'] (niveau 'info' par défaut)
 * ```
 */
export function getLogLevel(logLevel?: string): LogLevel[] {
  const logLevelMap: Record<LogLevel | string, LogLevel[]> = {
    fatal: ['fatal'],
    error: ['error', 'fatal'],
    warn: ['error', 'fatal', 'warn'],
    info: ['error', 'fatal', 'warn', 'log'],
    debug: ['error', 'fatal', 'warn', 'log', 'debug'],
    verbose: ['error', 'fatal', 'warn', 'log', 'debug', 'verbose'],
  }

  return logLevelMap[logLevel] || logLevelMap['info']
}

/**
 * Niveau de log par défaut pour l'application.
 *
 * Correspond au niveau 'info' qui inclut les logs, avertissements, erreurs et fatals.
 * Ce niveau offre un bon équilibre entre visibilité et performance pour la production.
 *
 * @constant
 * @type {LogLevel[]}
 * @default ['error', 'fatal', 'warn', 'log']
 */
export const DEFAULT_LOG_LEVEL: LogLevel[] = getLogLevel('info')

/**
 * Niveau de log minimal pour les commandes console.
 *
 * Mode silencieux affichant uniquement les erreurs critiques pour éviter
 * de polluer la sortie des commandes CLI. Utile lors de l'exécution de
 * scripts ou de tâches automatisées.
 *
 * @constant
 * @type {LogLevel[]}
 *
 * @description
 * Ce niveau est utilisé au démarrage des commandes console pour minimiser
 * le bruit dans les logs et garder une sortie propre et lisible.
 * Correspond au niveau 'warn' qui inclut warn, error et fatal.
 */
export const CONSOLE_LOG_LEVEL: LogLevel[] = getLogLevel('warn')
