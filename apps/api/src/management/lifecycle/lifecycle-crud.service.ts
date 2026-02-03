import { Injectable, OnModuleInit } from '@nestjs/common'
import { Model, Query, Types } from 'mongoose'
import { FilterOptions } from '~/_common/restools'
import { IdentityLifecycleDefault, IdentityLifecycleDefaultList, IdentityLifecycleState } from '../identities/_enums/lifecycle.enum'
import { Lifecycle, LifecycleRefId } from './_schemas/lifecycle.schema'
import { loadCustomStates } from './_functions/load-custom-states.function'
import { AbstractLifecycleService } from './_abstracts/abstract.lifecycle.service'

/**
 * Service CRUD de gestion du cycle de vie des identités
 *
 * @class LifecycleService
 * @extends AbstractServiceSchema
 * @description Service CRUD pour la gestion de l'historique et des statistiques du cycle de vie des identités.
 *
 * Fonctionnalités principales :
 * - Gestion de l'historique des changements de cycle de vie
 * - Fourniture de statistiques et rapports
 * - Gestion des états personnalisés
 * - Récupération des événements récents
 *
 * Note : Les automatisations (règles, cron, événements) sont gérées par LifecycleHooksService
 */
@Injectable()
export class LifecycleCrudService extends AbstractLifecycleService {
  private _lastStatesCacheRefresh?: number

  /**
   * Initialise le service en chargeant les états personnalisés
   *
   * @async
   * @method onModuleInit
   * @returns {Promise<void>}
   *
   * @description Hook du cycle de vie NestJS appelé lors de l'initialisation du module.
   * Charge les états personnalisés depuis states.yml pour les rendre disponibles
   * via les méthodes publiques du service.
   */
  public async onModuleInit(): Promise<void> {
    this.logger.verbose('Initializing LifecycleService (CRUD)...')

    await this.refreshCustomStatesCache()
    this._lastStatesCacheRefresh = Date.now()

    this.logger.log('LifecycleService (CRUD) initialized')
  }

  /**
   * Hook appelé après le bootstrap de l'application
   *
   * @async
   * @method onApplicationBootstrap
   * @returns {Promise<void>}
   *
   * @description Méthode vide implémentée pour respecter l'interface OnApplicationBootstrap.
   * Peut être utilisée à l'avenir pour des initialisations post-bootstrap si nécessaire.
   */
  public async onApplicationBootstrap(): Promise<void> {
    // Méthode vide pour l'instant
  }

  /**
   * Rafraîchit le cache des états personnalisés (states.yml)
   *
   * Met à jour `this.customStates` et `this._stateFileAge` pour les utiliser
   * dans les méthodes publiques du service.
   */
  private async refreshCustomStatesCache(): Promise<void> {
    const { customStates, stateFileAge } = await loadCustomStates()
    this.customStates = customStates
    this._stateFileAge = stateFileAge
    this.logger.debug('Lifecycle (CRUD) custom states cache refreshed.')
  }

  /**
   * Garantit que le cache des états est rafraîchi si le dernier refresh date de plus de TTL.
   * @param ttlMs Durée de validité du cache en millisecondes (par défaut 60s)
   */
  public async ensureStatesCacheFresh(ttlMs: number = 60_000): Promise<void> {
    const now = Date.now()
    if (!this._lastStatesCacheRefresh || (now - this._lastStatesCacheRefresh) > ttlMs) {
      await this.refreshCustomStatesCache()
      this._lastStatesCacheRefresh = now
      this.logger.verbose(`Lifecycle (CRUD) custom states cache ensured (TTL=${ttlMs}ms).`)
    }
  }

  /**
   * Récupère tous les états de cycle de vie disponibles
   *
   * @method getAllAvailableStates
   * @returns {Array<IdentityLifecycleState>} Tableau de tous les états (par défaut + personnalisés)
   *
   * @description Combine les états par défaut de l'énumération IdentityLifecycleDefault
   * avec les états personnalisés chargés depuis states.yml.
   *
   * Retourne un tableau contenant :
   * - Tous les états par défaut (IdentityLifecycleDefaultList)
   * - Tous les états personnalisés (this.customStates)
   *
   * Utilisé par le contrôleur pour l'endpoint GET /lifecycle/states
   *
   * @example
   * const allStates = lifecycleService.getAllAvailableStates();
   * // [
   * //   { key: 'A', label: 'En Attente', ... },
   * //   { key: 'O', label: 'Officiel', ... },
   * //   { key: 'C', label: 'Custom', ... } // état personnalisé
   * // ]
   */
  public getAllAvailableStates(): Array<IdentityLifecycleState> {
    const allStates: Array<IdentityLifecycleState> = [
      ...IdentityLifecycleDefaultList,
      ...this.customStates,
    ]

    return allStates
  }

  /**
   * Récupère uniquement les clés de tous les états disponibles
   *
   * @method getAllAvailableStateKeys
   * @returns {string[]} Tableau des clés d'états
   *
   * @description Retourne seulement les clés (keys) de tous les états disponibles,
   * combinant les états par défaut et personnalisés.
   *
   * Utile pour la validation ou la vérification rapide de l'existence d'un état.
   *
   * @example
   * const keys = lifecycleService.getAllAvailableStateKeys();
   * // ['A', 'O', 'M', 'X', 'C', 'D', ...]
   */
  public getAllAvailableStateKeys(): string[] {
    const defaultKeys = Object.values(IdentityLifecycleDefault)
    const customKeys = this.customStates.map(state => state.key)

    return [...defaultKeys, ...customKeys]
  }

  /**
   * Récupère uniquement les états personnalisés
   *
   * @method getCustomStates
   * @returns {IdentityLifecycleState[]} Tableau des états personnalisés uniquement
   *
   * @description Retourne seulement les états chargés depuis states.yml,
   * excluant les états par défaut de l'énumération.
   *
   * Utilisé par le contrôleur pour l'endpoint GET /lifecycle/states/custom
   *
   * @example
   * const customStates = lifecycleService.getCustomStates();
   * // [{ key: 'C', label: 'Custom', description: '...' }]
   */
  public getCustomStates(): IdentityLifecycleState[] {
    return [...this.customStates]
  }

  /**
   * Récupère uniquement les clés des états personnalisés
   *
   * @method getCustomStateKeys
   * @returns {string[]} Tableau des clés d'états personnalisés
   *
   * @description Retourne seulement les clés (keys) des états personnalisés.
   *
   * @example
   * const customKeys = lifecycleService.getCustomStateKeys();
   * // ['C', 'D', 'E']
   */
  public getCustomStateKeys(): string[] {
    return this.customStates.map(state => state.key)
  }

  /**
   * Récupère l'historique du cycle de vie pour une identité spécifique
   *
   * @async
   * @method getLifecycleHistory
   * @param {Types.ObjectId} refId - Identifiant de l'identité
   * @param {FilterOptions} [options] - Options de filtrage, tri et pagination
   * @returns {Promise<[number, Query<Array<Lifecycle>, Lifecycle, any, Lifecycle>[]]>} Tuple [total, données]
   *
   * @description Retourne tous les événements de cycle de vie associés à une identité,
   * triés par date de création décroissante (plus récents en premier).
   *
   * Supporte :
   * - Pagination (skip, limit)
   * - Tri personnalisé
   * - Population de la référence refId
   *
   * @example
   * const [total, history] = await lifecycleService.getLifecycleHistory(
   *   identityId,
   *   { skip: 0, limit: 10 }
   * );
   * // total: 25
   * // history: [{ lifecycle: 'MANUAL', date: '...' }, ...]
   */
  public async getLifecycleHistory(
    refId: Types.ObjectId,
    options?: FilterOptions,
  ): Promise<[number, Query<Array<Lifecycle>, Lifecycle, any, Lifecycle>[]]> {
    const result = await this.find<Lifecycle>({ refId }, null, {
      populate: LifecycleRefId,
      sort: {
        ...options?.sort,
        createdAt: -1,
      },
      skip: options?.skip || 0,
      limit: options?.limit || 100,
    })
    const total = await this.count({ refId })

    return [total, result]
  }

  /**
   * Récupère les statistiques du cycle de vie
   *
   * @async
   * @method getLifecycleStats
   * @returns {Promise<any>} Statistiques agrégées par état de cycle de vie
   *
   * @description Agrège les événements de cycle de vie par type et compte les occurrences.
   * Utilise MongoDB aggregation pipeline pour grouper par état et compter.
   *
   * Retourne un tableau d'objets contenant :
   * - _id : État de cycle de vie
   * - count : Nombre d'occurrences
   *
   * @example
   * const stats = await lifecycleService.getLifecycleStats();
   * // [
   * //   { _id: 'OFFICIAL', count: 1250 },
   * //   { _id: 'MANUAL', count: 340 },
   * //   { _id: 'ARCHIVED', count: 89 }
   * // ]
   */
  public async getLifecycleStats(): Promise<any> {
    const stats = await this._model.aggregate([
      {
        $group: {
          _id: '$lifecycle',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    return stats
  }

  /**
   * Récupère les changements récents du cycle de vie
   *
   * @async
   * @method getRecentChanges
   * @param {FilterOptions} [options] - Options de filtrage, tri et pagination
   * @returns {Promise<[number, Query<Array<Lifecycle>, Lifecycle, any, Lifecycle>[]]>} Tuple [total, données]
   *
   * @description Retourne les événements de cycle de vie les plus récents sur l'ensemble
   * du système, triés par date de création décroissante.
   *
   * Supporte :
   * - Pagination (skip, limit par défaut 100)
   * - Tri personnalisé
   * - Population de la référence refId
   *
   * Utilisé pour le monitoring en temps réel et l'audit des transitions.
   *
   * @example
   * const [total, recent] = await lifecycleService.getRecentChanges(
   *   { skip: 0, limit: 20 }
   * );
   * // total: 1567
   * // recent: [{ refId: {...}, lifecycle: 'MANUAL', date: '...' }, ...]
   */
  public async getRecentChanges(
    options?: FilterOptions,
  ): Promise<[number, Query<Array<Lifecycle>, Lifecycle, any, Lifecycle>[]]> {
    const total = await this.count({})
    const result = await this.find<Lifecycle>({}, null, {
      populate: 'refId',
      sort: {
        ...options?.sort,
        createdAt: -1,
      },
      skip: options?.skip || 0,
      limit: options?.limit || 100,
    })

    return [total, result]
  }
}
