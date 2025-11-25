/**
 * Énumération des états possibles d'un agent dans son état.
 *
 * Cette énumération définit les différents statuts qu'un agent peut avoir,
 * permettant de gérer son activation, sa désactivation et son workflow de validation.
 *
 * @enum {number}
 *
 * @description
 * États disponibles :
 * - **DISABLED** (-1) : Agent désactivé, ne peut pas s'authentifier ni effectuer d'actions
 * - **PENDING** (0) : Agent en attente d'activation ou de validation
 * - **ACTIVE** (1) : Agent actif et opérationnel, peut s'authentifier et effectuer des actions
 *
 * Transitions typiques :
 * - PENDING → ACTIVE : Activation de l'agent après validation
 * - ACTIVE → DISABLED : Désactivation temporaire ou définitive
 * - DISABLED → ACTIVE : Réactivation d'un agent désactivé
 * - PENDING → DISABLED : Refus/annulation de la création
 *
 * @example
 * ```typescript
 * // Vérifier l'état d'un agent
 * if (agent.state.current === AgentState.ACTIVE) {
 *   // L'agent peut se connecter
 * }
 *
 * // Activer un agent en attente
 * agent.state.current = AgentState.ACTIVE;
 * agent.state.lastChangedAt = new Date();
 *
 * // Désactiver un agent
 * agent.state.current = AgentState.DISABLED;
 * ```
 */
export enum AgentState {
  /** Agent désactivé, ne peut pas s'authentifier */
  DISABLED = -1,
  /** Agent en attente d'activation ou de validation */
  PENDING = 0,
  /** Agent actif et opérationnel */
  ACTIVE = 1,
}

/**
 * Liste des valeurs numériques de l'énumération AgentState.
 *
 * Utilisé pour la validation des valeurs d'état dans le schéma Mongoose.
 * Extrait automatiquement toutes les valeurs numériques de l'enum AgentState.
 *
 * @constant {number[]}
 * @example [-1, 0, 1]
 */
export const AgentStateList: number[] = Object.keys(AgentState)
  .filter((k) => typeof AgentState[k as any] === 'number')
  .map((k) => parseInt(AgentState[k as any], 10))
