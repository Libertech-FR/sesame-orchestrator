import { ConfigRulesObjectIdentitiesDTO } from '../_dto/config-rules.dto'

/**
 * Interface représentant les sources de cycle de vie et leurs règles associées
 *
 * @interface LifecycleSource
 * @description Map associant chaque état source à un tableau de règles de transition.
 * Permet un accès rapide aux règles applicables pour un état donné.
 *
 * @example
 * {
 *   'OFFICIAL': [{ sources: ['OFFICIAL'], trigger: 90, target: 'MANUAL' }],
 *   'MANUAL': [{ sources: ['MANUAL'], trigger: 30, target: 'ARCHIVED' }]
 * }
 */
export interface LifecycleSource {
  [source: string]: Partial<ConfigRulesObjectIdentitiesDTO>[]
}
