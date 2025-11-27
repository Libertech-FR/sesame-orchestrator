import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema'
import { LifecycleSource } from '../_interfaces/lifecycle-sources.interface'
import { LifecycleStateDTO } from '../_dto/config-states.dto'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Lifecycle } from '../_schemas/lifecycle.schema'
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service'
import { Injectable, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common'
import { BackendsService } from '~/core/backends/backends.service'
import { SchedulerRegistry } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'

@Injectable()
export abstract class AbstractLifecycleService extends AbstractServiceSchema implements OnModuleInit, OnApplicationBootstrap {
  /**
   * Map des sources de cycle de vie et leurs règles associées
   * @protected
   * @type {LifecycleSource}
   */
  protected lifecycleSources: LifecycleSource = {}

  /**
   * Liste des états personnalisés chargés depuis states.yml
   * @protected
   * @type {LifecycleStateDTO[]}
   */
  protected customStates: LifecycleStateDTO[] = []

  /**
   * Timestamp de la dernière modification du fichier states.yml
   * @protected
   * @type {number}
   */
  protected _stateFileAge = 0

  /**
   * Constructeur du service de cycle de vie
   *
   * @param {Model<Lifecycle>} _model - Modèle Mongoose pour les événements de cycle de vie
   * @param {IdentitiesCrudService} identitiesService - Service CRUD des identités
   * @param {BackendsService} backendsService - Service de gestion des backends
   * @param {SchedulerRegistry} schedulerRegistry - Registre des tâches planifiées
   * @param {ConfigService} configService - Service de configuration
   */
  public constructor(
    @InjectModel(Lifecycle.name) protected _model: Model<Lifecycle>,
    protected readonly identitiesService: IdentitiesCrudService,
    protected readonly backendsService: BackendsService,
    protected readonly schedulerRegistry: SchedulerRegistry,
    protected readonly configService: ConfigService,
  ) {
    super()
  }

  /**
   * Getter pour l'âge du fichier states.yml
   *
   * @returns {number} Timestamp de la dernière modification du fichier
   * @description Utilisé pour le cache HTTP des états de cycle de vie
   */
  public get stateFileAge(): number {
    return this._stateFileAge
  }

  /**
   * Récupère la map des sources de cycle de vie
   *
   * @method listLifecycleSources
   * @returns {LifecycleSource} Map des états source et leurs règles de transition
   *
   * @description Retourne la structure interne des sources de cycle de vie chargées.
   * Chaque clé correspond à un état source, et la valeur est un tableau de règles
   * de transition applicables depuis cet état.
   *
   * Utilisé principalement par les commandes CLI pour l'inspection de la configuration.
   *
   * @example
   * const sources = lifecycleService.listLifecycleSources();
   * // {
   * //   'OFFICIAL': [{ sources: ['OFFICIAL'], trigger: 90, target: 'MANUAL' }],
   * //   'MANUAL': [{ sources: ['MANUAL'], trigger: 30, target: 'ARCHIVED' }]
   * // }
   */
  public listLifecycleSources(): LifecycleSource {
    return this.lifecycleSources
  }

  public async onModuleInit(): Promise<void> {
    this.logger.warn(`LifecycleService (abstract) onModuleInit called - this should be implemented in subclasses !`)
  }

  public async onApplicationBootstrap(): Promise<void> {
    this.logger.warn(`LifecycleService (abstract) onApplicationBootstrap called - this should be implemented in subclasses !`)
  }
}
