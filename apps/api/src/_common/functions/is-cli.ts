import path from 'node:path'
import { Abstract, DynamicModule, ForwardReference, Provider, Type } from '@nestjs/common'
import { isArray } from 'radash'

/**
 * Vérifie si le point d'entrée actuel est le mode console.
 *
 * Détermine si l'application a été lancée via le fichier console.ts ou console.js
 * en analysant le nom du fichier principal d'exécution.
 *
 * @returns {boolean} `true` si l'application est en mode console, `false` sinon
 *
 * @description
 * La détection se fait en vérifiant le nom du fichier d'entrée via :
 * 1. require.main.filename (module principal)
 * 2. process.argv[1] (premier argument du processus)
 */
export function isConsoleEntrypoint(): boolean {
  const entry =
    (require?.main?.filename ?? process.argv[1] ?? '').toLowerCase()
  const base = path.basename(entry)
  return /^(console)\.(t|j)s$/.test(base)
}

/**
 * Retourne des providers, modules ou imports uniquement en mode console (CLI).
 *
 * Cette fonction utilitaire permet de conditionner l'inclusion de modules,
 * providers ou imports NestJS au contexte d'exécution. Les éléments ne seront
 * inclus que si l'application est lancée en mode console.
 *
 * @template T Type des éléments (Provider, DynamicModule, etc.)
 * @param {T | T[]} items - Élément(s) à inclure conditionnellement
 * @returns {T[]} Tableau des éléments si en mode console, tableau vide sinon
 *
 * @description
 * Cas d'usage typiques :
 * - Charger des modules CLI uniquement en mode console
 * - Injecter des providers spécifiques aux commandes
 * - Éviter le chargement de dépendances inutiles en mode serveur
 *
 * La fonction normalise toujours le retour en tableau, que l'entrée
 * soit un élément unique ou un tableau.
 *
 * @example
 * ```typescript
 * // Dans un module NestJS
 * @Module({
 *   imports: [
 *     CommonModule,
 *     ...useOnCli([
 *       CommanderModule,
 *       InquirerModule,
 *     ]),
 *   ],
 *   providers: [
 *     AppService,
 *     ...useOnCli(CliService),
 *   ],
 * })
 * export class AppModule {}
 *
 * // En mode console : CommanderModule et InquirerModule sont chargés
 * // En mode serveur : Ces modules sont ignorés
 * ```
 */
export function useOnCli<
  T = Provider
  | (Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference<any>)
  | (string | symbol | Function | Provider | DynamicModule | Promise<DynamicModule> | ForwardReference<any> | Abstract<any>),
>(items: T | T[]): T[] {
  if (isConsoleEntrypoint()) {
    return isArray(items) ? items : [items]
  }
  return []
}
