import { Injectable, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { InjectModel } from '@nestjs/mongoose'
import { SchedulerRegistry } from '@nestjs/schedule'
import { plainToInstance } from 'class-transformer'
import { validateOrReject, ValidationError } from 'class-validator'
import { CronJob } from 'cron'
import { Model, Query, Types } from 'mongoose'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { parse } from 'yaml'
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema'
import { FilterOptions } from '~/_common/restools'
import { Identities } from '../identities/_schemas/identities.schema'
import { IdentitiesCrudService } from '../identities/identities-crud.service'
import { ConfigRulesObjectIdentitiesDTO, ConfigRulesObjectSchemaDTO } from './_dto/config-rules.dto'
import { ConfigStatesDTO, LifecycleStateDTO } from './_dto/config-states.dto'
import { IdentityLifecycleDefault, IdentityLifecycleDefaultList, IdentityLifecycleState } from '../identities/_enums/lifecycle.enum'
import { Lifecycle, LifecycleRefId } from './_schemas/lifecycle.schema'
import { ConfigService } from '@nestjs/config'
import dayjs from 'dayjs'
import { isConsoleEntrypoint } from '~/_common/functions/is-cli'
import { BackendsService } from '~/core/backends/backends.service'

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
interface LifecycleSource {
  [source: string]: Partial<ConfigRulesObjectIdentitiesDTO>[]
}

/**
 * Service de gestion du cycle de vie des identités
 *
 * @class LifecycleService
 * @extends AbstractServiceSchema
 * @implements {OnApplicationBootstrap, OnModuleInit}
 * @description Service principal pour la gestion du cycle de vie des identités.
 *
 * Fonctionnalités principales :
 * - Chargement et validation des règles de transition depuis les fichiers YAML
 * - Chargement des états personnalisés depuis states.yml
 * - Exécution périodique des transitions basées sur le temps (cron)
 * - Écoute des événements de modification d'identités pour appliquer les règles
 * - Gestion de l'historique des changements de cycle de vie
 * - Fourniture de statistiques et rapports
 *
 * Cycle de vie :
 * 1. onModuleInit : Copie les fichiers de configuration par défaut si absents
 * 2. onApplicationBootstrap : Charge les règles, configure le cron
 * 3. Runtime : Écoute les événements et exécute les transitions
 */
@Injectable()
export class LifecycleService extends AbstractServiceSchema implements OnApplicationBootstrap, OnModuleInit {
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
    private readonly backendsService: BackendsService,
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
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
   * Initialise le service lors du chargement du module
   *
   * @method onModuleInit
   * @returns {void}
   *
   * @description Hook du cycle de vie NestJS appelé lors de l'initialisation du module.
   * Réalise les opérations suivantes :
   * 1. Lit les fichiers de configuration depuis `configs/lifecycle`
   * 2. Copie les fichiers par défaut depuis `defaults/lifecycle` s'ils sont absents
   * 3. Copie les règles par défaut depuis `defaults/lifecycle/rules` si nécessaire
   *
   * Garantit que la configuration minimale est toujours présente pour le bon
   * fonctionnement du système de cycle de vie.
   *
   * @example
   * // Appelé automatiquement par NestJS
   * // Crée configs/lifecycle/states.yml depuis defaults/ si absent
   * // Crée configs/lifecycle/rules/*.yml depuis defaults/ si absent
   */
  public onModuleInit(): void {
    let files = []
    let filesRules = []
    let defaultFiles = []
    let defaultFilesRules = []

    this.logger.verbose('Initializing LifecycleService...')

    try {
      files = readdirSync(`${process.cwd()}/configs/lifecycle`)
      defaultFiles = readdirSync(`${process.cwd()}/defaults/lifecycle`)

      filesRules = readdirSync(`${process.cwd()}/configs/lifecycle/rules`)
      defaultFilesRules = readdirSync(`${process.cwd()}/defaults/lifecycle/rules`)
    } catch (error) {
      this.logger.error('Error reading lifecycle validations files', error.message, error.stack)
    }

    for (const file of defaultFiles) {
      if (!files.includes(file)) {
        try {
          const defaultFile = readFileSync(`${process.cwd()}/defaults/lifecycle/${file}`, 'utf-8')
          writeFileSync(`${process.cwd()}/configs/lifecycle/${file}`, defaultFile)
          this.logger.warn(`Copied default validation file: ${file}`)
        } catch (error) {
          this.logger.error(`Error copying default validation file: ${file}`, error.message, error.stack)
        }
      }
    }

    if (files.length === 0) {
      for (const file of defaultFilesRules) {
        if (!files.includes(file)) {
          try {
            const defaultFile = readFileSync(`${process.cwd()}/defaults/lifecycle/rules/${file}`, 'utf-8')
            writeFileSync(`${process.cwd()}/configs/lifecycle/rules/${file}`, defaultFile)
            this.logger.warn(`Copied default validation file: ${file}`)
          } catch (error) {
            this.logger.error(`Error copying default validation file: ${file}`, error.message, error.stack)
          }
        }
      }
    }

    this.logger.log('LifecycleService initialized')
  }

  /**
   * Bootstrap du service au démarrage de l'application
   *
   * @async
   * @method onApplicationBootstrap
   * @returns {Promise<void>}
   *
   * @description Hook du cycle de vie NestJS appelé lors du démarrage de l'application.
   * Réalise les opérations suivantes :
   * 1. Charge toutes les règles de transition depuis les fichiers YAML
   * 2. Charge les états personnalisés depuis states.yml
   * 3. Construit la map lifecycleSources pour un accès rapide aux règles
   * 4. Configure et démarre le job cron pour les transitions temporelles (sauf en mode console)
   *
   * Le job cron utilise l'expression configurée dans `lifecycle.triggerCronExpression`
   * (par défaut : toutes les 5 minutes).
   *
   * @example
   * // Appelé automatiquement par NestJS au démarrage
   * // Configure le cron toutes les 5 minutes
   * // Charge les règles depuis configs/lifecycle/rules
   */
  public async onApplicationBootstrap(): Promise<void> {
    this.logger.verbose('Bootstrap LifecycleService application...')

    const lifecycleRules = await this.loadLifecycleRules()
    await this.loadCustomStates()

    for (const lfr of lifecycleRules) {
      for (const idRule of lfr.identities) {
        for (const source of idRule.sources) {
          if (!this.lifecycleSources[source]) {
            this.lifecycleSources[source] = []
          }
          this.lifecycleSources[source].push(idRule)
        }
      }
    }

    this.logger.debug('Lifecycle sources loaded:', JSON.stringify(this.lifecycleSources, null, 2))

    if (isConsoleEntrypoint) {
      this.logger.debug('Skipping LifecycleService bootstrap in console mode.')
      return
    }

    const cronExpression = this.configService.get<string>('lifecycle.triggerCronExpression') || '*/5 * * * *'
    const job = new CronJob(cronExpression, this.handleCron.bind(this, { lifecycleRules }))
    this.schedulerRegistry.addCronJob(`lifecycle-trigger`, job)
    this.logger.warn(`Lifecycle trigger cron job scheduled with expression: <${cronExpression}>`)

    job.addCallback(async (): Promise<void> => {
      const now = dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss')
      this.logger.debug(`Lifecycle trigger cron job executed at <${now}> !`)

      const nextDate = dayjs(job.nextDate().toJSDate()).format('YYYY-MM-DD HH:mm:ss')
      this.logger.verbose(`Next execution at <${nextDate}>`)
    })
    job.start()

    this.logger.log('LifecycleService bootstraped')
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

  /**
   * Gestionnaire de la tâche cron pour les transitions temporelles
   *
   * @async
   * @private
   * @method handleCron
   * @param {Object} params - Paramètres de la tâche
   * @param {ConfigRulesObjectSchemaDTO[]} params.lifecycleRules - Règles de cycle de vie chargées
   * @returns {Promise<void>}
   *
   * @description Exécute périodiquement les transitions de cycle de vie basées sur le temps.
   * Pour chaque règle avec un trigger temporel :
   * 1. Recherche les identités éligibles (bon état source, date dépassée)
   * 2. Applique la mutation et change l'état vers la cible
   * 3. Crée un événement de cycle de vie
   * 4. Met à jour lastLifecycleUpdate
   *
   * Les identités avec `ignoreLifecycle: true` sont exclues du traitement.
   *
   * @example
   * // Appelé automatiquement par le cron (toutes les 5 min par défaut)
   * // Trouve les identités OFFICIAL depuis > 90 jours
   * // Les transition vers MANUAL
   */
  private async handleCron({ lifecycleRules }: { lifecycleRules: ConfigRulesObjectSchemaDTO[] }): Promise<void> {
    this.logger.debug(`Running lifecycle trigger cron job...`)

    for (const lfr of lifecycleRules) {
      for (const idRule of lfr.identities) {
        if (idRule.trigger) {
          const dateKey = idRule.dateKey || 'lastLifecycleUpdate'

          try {
            const identities = await this.identitiesService.model.find({
              ...idRule.rules,
              lifecycle: {
                $in: idRule.sources,
              },
              ignoreLifecycle: { $ne: true },
              [dateKey]: {
                $lte: new Date(Date.now() - (idRule.trigger * 1000)),
              },
            })
            this.logger.log(`Found ${identities.length} identities to process for trigger in source <${idRule.sources}>`)
            this.logger.verbose(`identities process triggered`, JSON.stringify(idRule, null, 2))

            for (const identity of identities) {
              const updated = await this.identitiesService.model.findOneAndUpdate(
                { _id: identity._id },
                {
                  $set: {
                    ...idRule.mutation,
                    lifecycle: idRule.target,
                    lastLifecycleUpdate: new Date(),
                  },
                },
                { new: true },
              )

              if (updated) {
                await this.create({
                  refId: identity._id,
                  lifecycle: idRule.target,
                  date: new Date(),
                })

                this.logger.log(`Identity <${identity._id}> updated to lifecycle <${idRule.target}> by trigger from source <${idRule.sources}>`)
              }
            }

          } catch (error) {
            this.logger.error(`Error in lifecycle trigger job for source <${idRule.sources}>:`, error.message, error.stack)
          }
        }
      }
    }

    this.logger.log(`Lifecycle trigger cron job completed.`)
  }

  /**
   * Charge les règles de cycle de vie depuis les fichiers de configuration
   *
   * @async
   * @private
   * @method loadLifecycleRules
   * @returns {Promise<ConfigRulesObjectSchemaDTO[]>} Tableau des règles chargées et validées
   *
   * @description Lit tous les fichiers YAML depuis `configs/lifecycle/rules`,
   * les parse en DTOs, les valide avec class-validator et les retourne.
   * Chaque fichier doit contenir une structure conforme au schéma ConfigRulesObjectSchemaDTO.
   *
   * Processus :
   * 1. Scan du répertoire configs/lifecycle/rules
   * 2. Lecture de chaque fichier .yml/.yaml
   * 3. Parsing YAML vers objet JavaScript
   * 4. Transformation en DTO avec class-transformer
   * 5. Validation avec class-validator
   * 6. Retour du tableau de règles valides
   *
   * @throws {Error} Si la validation d'un fichier échoue
   *
   * @example
   * // Charge tous les fichiers .yml depuis configs/lifecycle/rules/
   * // Valide la structure de chaque fichier
   * // Retourne les règles pour utilisation par le cron
   */
  private async loadLifecycleRules(): Promise<ConfigRulesObjectSchemaDTO[]> {
    let files: string[] = []

    const lifecycleRules: ConfigRulesObjectSchemaDTO[] = []
    this.logger.verbose('Loading lifecycle rules from configuration files...')
    this.logger.verbose('Initializing LifecycleService...')

    try {
      files = readdirSync(`${process.cwd()}/configs/lifecycle/rules`)
    } catch (error) {
      this.logger.error('Error reading lifecycle files', error.message, error.stack)
    }

    for (const file of files) {
      let schema: ConfigRulesObjectSchemaDTO
      if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
        this.logger.warn(`Skipping non-YAML file: ${file}`)
        continue
      }

      try {
        const data = readFileSync(`${process.cwd()}/configs/lifecycle/rules/${file}`, 'utf-8')
        this.logger.debug(`Loaded lifecycle config: ${file}`)
        const yml = parse(data)
        schema = plainToInstance(ConfigRulesObjectSchemaDTO, yml)

      } catch (error) {
        this.logger.error(`Error loading lifecycle config file: ${file}`, error.message, error.stack)
        continue
      }

      if (!schema || !schema.identities || !Array.isArray(schema.identities)) {
        this.logger.error(`Invalid schema in file: ${file}`)
        continue
      }

      try {
        this.logger.verbose(`Validating schema for file: ${file}`, JSON.stringify(schema, null, 2))
        await validateOrReject(schema, {
          whitelist: true,
        })
        this.logger.debug(`Validated schema for file: ${file}`)
      } catch (errors) {
        const formattedErrors = this.formatValidationErrors(errors, file)
        const err = new Error(`Validation errors in file '${file}':\n${formattedErrors}`)
        throw err
      }

      lifecycleRules.push(schema)
      this.logger.debug(`Lifecycle activated from file: ${file}`)
    }

    this.logger.log(`Loaded <${lifecycleRules.length}> lifecycle rules from configuration files.`)
    return lifecycleRules
  }

  /**
   * Charge les états personnalisés depuis le fichier states.yml
   *
   * @async
   * @private
   * @method loadCustomStates
   * @returns {Promise<LifecycleStateDTO[]>} Tableau des états personnalisés chargés
   *
   * @description Lit le fichier states.yml depuis `configs/lifecycle`, le parse,
   * le valide et stocke les états personnalisés. Également stocke l'âge du fichier
   * pour le cache HTTP.
   *
   * Validations effectuées :
   * - Clé d'état doit être exactement 1 caractère
   * - Clés doivent être uniques
   * - Clés ne doivent pas entrer en conflit avec les états par défaut
   *
   * Met à jour :
   * - this.customStates : tableau des états personnalisés
   * - this._stateFileAge : timestamp de modification du fichier
   *
   * @throws {Error} Si la validation échoue ou si une clé est en conflit
   *
   * @example
   * // Charge states.yml
   * // Valide que les clés sont uniques et non conflictuelles
   * // Stocke dans this.customStates pour utilisation par l'API
   */
  private async loadCustomStates(): Promise<LifecycleStateDTO[]> {
    const customStates: LifecycleStateDTO[] = []
    this.logger.verbose('Loading custom lifecycle states from states.yml...')

    try {
      const statesFilePath = `${process.cwd()}/configs/lifecycle/states.yml`
      const data = readFileSync(statesFilePath, 'utf-8')
      const { mtimeMs } = statSync(statesFilePath)
      this._stateFileAge = mtimeMs
      this.logger.debug('Loaded custom states config: states.yml')

      const yml = parse(data)
      const configStates = plainToInstance(ConfigStatesDTO, yml)

      if (!configStates || !configStates.states || !Array.isArray(configStates.states)) {
        this.logger.error('Invalid schema in states.yml file')
        return customStates
      }

      try {
        this.logger.verbose('Validating schema for states.yml', JSON.stringify(configStates, null, 2))
        await validateOrReject(configStates, {
          whitelist: true,
        })
        this.logger.debug('Validated schema for states.yml')
      } catch (errors) {
        const formattedErrors = this.formatValidationErrors(errors, 'states.yml')
        const err = new Error(`Validation errors in states.yml:\n${formattedErrors}`)
        throw err
      }

      // Valider que chaque clé est unique et d'une seule lettre
      const usedKeys = new Set<string>()
      for (const state of configStates.states) {
        if (state.key.length !== 1) {
          throw new Error(`State key '${state.key}' must be exactly one character`)
        }

        if (usedKeys.has(state.key)) {
          throw new Error(`Duplicate state key '${state.key}' found in states.yml`)
        }

        // Vérifier que la clé n'existe pas déjà dans l'enum par défaut
        if (Object.values(IdentityLifecycleDefault).includes(state.key as IdentityLifecycleDefault)) {
          throw new Error(`State key '${state.key}' conflicts with default lifecycle state`)
        }

        usedKeys.add(state.key)
        customStates.push(state)
      }

      this.customStates = customStates
      this.logger.log(`Loaded <${customStates.length}> custom lifecycle states from states.yml`)

    } catch (error) {
      this.logger.error('Error loading custom states from states.yml', error.message, error.stack)
    }

    return customStates
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
   * Formate les erreurs de validation pour une meilleure lisibilité
   *
   * @private
   * @method formatValidationErrors
   * @param {ValidationError[]} errors - Tableau d'erreurs de class-validator
   * @param {string} file - Nom du fichier où la validation a échoué
   * @param {string} [basePath=''] - Chemin de base pour la construction du chemin de propriété
   * @param {boolean} [isInArrayContext=false] - Indique si on est dans un contexte de tableau
   * @returns {string} Message d'erreur formaté et lisible
   *
   * @description Transforme récursivement les erreurs de validation class-validator
   * en messages d'erreur lisibles avec le chemin complet de chaque propriété en erreur.
   *
   * Gère :
   * - Propriétés imbriquées (notation pointée)
   * - Tableaux (notation avec index)
   * - Contraintes multiples par propriété
   * - Erreurs hiérarchiques récursives
   *
   * @example
   * // Retourne :
   * // • Property 'identities[0].trigger': must be a number (constraint: isNumber)
   * // • Property 'identities[1].sources': should not be empty (constraint: isNotEmpty)
   */
  private formatValidationErrors(errors: ValidationError[], file: string, basePath: string = '', isInArrayContext: boolean = false): string {
    const formatError = (error: ValidationError, currentPath: string, inArrayContext: boolean): string[] => {
      let propertyPath = currentPath

      /**
       * Check if error.property is defined, not null, not empty, and not the string 'undefined'.
       * If it is, we construct the property path based on whether we are in an array context or not.
       * If it is an array context, we use the index notation; otherwise, we use dot notation.
       */
      if (error.property !== undefined &&
        error.property !== null &&
        error.property !== '' &&
        error.property !== 'undefined') {
        if (inArrayContext && !isNaN(Number(error.property))) {
          // C'est un index d'array
          propertyPath = currentPath ? `${currentPath}[${error.property}]` : `[${error.property}]`
        } else {
          // C'est une propriété normale
          propertyPath = currentPath ? `${currentPath}.${error.property}` : error.property
        }
      }

      const errorMessages: string[] = []

      /**
       * Check if error.constraints is defined and not empty.
       * If it is, we iterate over each constraint and format the error message.
       */
      if (error.constraints) {
        Object.entries(error.constraints).forEach(([constraintKey, message]) => {
          errorMessages.push(`Property '${propertyPath}': ${message} (constraint: ${constraintKey})`)
        })
      }

      /**
       * If the error has children, we recursively format each child error.
       * We check if the error has children and if they are defined.
       */
      if (error.children && error.children.length > 0) {
        const isNextLevelArray = Array.isArray(error.value)
        error.children.forEach(childError => {
          errorMessages.push(...formatError(childError, propertyPath, isNextLevelArray))
        })
      }

      return errorMessages
    }

    const allErrorMessages: string[] = []
    errors.forEach(error => {
      allErrorMessages.push(...formatError(error, basePath, isInArrayContext))
    })

    return allErrorMessages.map(msg => `• ${msg}`).join('\n')
  }

  /**
   * Gestionnaire d'événements de mise à jour d'identité
   *
   * @async
   * @method handle
   * @param {Object} event - Événement contenant les données de mise à jour
   * @param {Identities} event.updated - Identité après mise à jour
   * @param {Identities} [event.before] - Identité avant mise à jour (optionnel)
   * @returns {Promise<void>}
   *
   * @description Écoute l'événement 'management.identities.service.afterUpdate'.
   * Lorsqu'une identité est mise à jour, ce gestionnaire :
   * 1. Vérifie la validité des données de l'identité
   * 2. Délègue à fireLifecycleEvent pour traiter le changement potentiel de cycle de vie
   *
   * Si l'état de cycle de vie a changé, un événement est créé et les règles
   * de transition automatique sont évaluées.
   *
   * @example
   * // Déclenché automatiquement lors de :
   * // await identitiesService.update(id, { lifecycle: 'MANUAL' })
   */
  @OnEvent('management.identities.service.afterUpdate')
  public async handle(event: { updated: Identities, before?: Identities }): Promise<void> {
    this.logger.verbose(`Handling identity update event for identity <${event.updated._id}>`)

    if (!event.updated || !event.updated._id) {
      this.logger.warn('No valid identity found in event data')
      return
    }

    await this.fireLifecycleEvent(event.before, event.updated)
  }

  /**
   * Gestionnaire d'événements d'upsert d'identité
   *
   * @async
   * @method handleOrderCreatedEvent
   * @param {Object} event - Événement contenant les données d'upsert
   * @param {Identities} event.result - Identité résultante après upsert
   * @param {Identities} [event.before] - Identité avant upsert si elle existait (optionnel)
   * @returns {Promise<void>}
   *
   * @description Écoute l'événement 'management.identities.service.afterUpsert'.
   * Lorsqu'une identité est créée ou mise à jour via upsert, ce gestionnaire :
   * 1. Vérifie la validité des données de l'identité
   * 2. Délègue à fireLifecycleEvent pour traiter le changement potentiel de cycle de vie
   *
   * Similaire à handle() mais pour les opérations d'upsert (création/mise à jour).
   *
   * @example
   * // Déclenché automatiquement lors de :
   * // await identitiesService.upsert(filter, data)
   */
  @OnEvent('management.identities.service.afterUpsert')
  public async handleOrderCreatedEvent(event: { result: Identities, before?: Identities }): Promise<void> {
    this.logger.verbose(`Handling identity upsert event for identity <${event.result._id}>`)

    if (!event.result || !event.result._id) {
      this.logger.warn('No valid identity found in event data')
      return
    }

    await this.fireLifecycleEvent(event.before, event.result)
  }

  /**
   * Déclenche un événement de cycle de vie et applique les règles de transition
   *
   * @async
   * @private
   * @method fireLifecycleEvent
   * @param {Identities} before - Identité avant modification
   * @param {Identities} after - Identité après modification
   * @returns {Promise<void>}
   *
   * @description Processus principal de gestion du cycle de vie lors d'un changement.
   *
   * Si le cycle de vie a changé (before.lifecycle !== after.lifecycle) :
   * 1. Crée un événement de cycle de vie dans l'historique
   * 2. Log le changement manuel
   *
   * Si des règles sont définies pour le nouvel état (lifecycleSources[after.lifecycle]) :
   * 1. Évalue chaque règle (sauf celles avec trigger temporel)
   * 2. Vérifie si l'identité correspond aux critères de la règle
   * 3. Applique la mutation et transition vers l'état cible
   * 4. Crée un événement de cycle de vie
   * 5. Notifie les backends du changement
   *
   * Les identités avec `ignoreLifecycle: true` sont exclues.
   *
   * @example
   * // Identité passe à OFFICIAL
   * // Si une règle OFFICIAL -> MANUAL existe et match
   * // L'identité est automatiquement transitionnée vers MANUAL
   */
  private async fireLifecycleEvent(before: Identities, after: Identities): Promise<void> {
    if (before.lifecycle !== after.lifecycle) {
      await this.create({
        refId: after._id,
        lifecycle: after.lifecycle,
        date: new Date(),
      })
      this.logger.debug(`Lifecycle event manualy recorded for identity <${after._id}>: ${after.lifecycle}`)
      // If the lifecycle has changed, we need to process the new lifecycle
    }

    if (this.lifecycleSources[after.lifecycle]) {
      this.logger.debug(`Processing lifecycle sources for identity <${after._id}> with lifecycle <${after.lifecycle}>`)

      for (const lcs of this.lifecycleSources[after.lifecycle]) {
        this.logger.verbose(`Processing lifecycle source <${after.lifecycle}> with rules: ${JSON.stringify(lcs.rules)}`)

        if (lcs.trigger) {
          this.logger.debug(`Skipping lifecycle source <${after.lifecycle}> with trigger: ${lcs.trigger}`)
          continue // Skip processing if it's a trigger-based rule
        }

        const res = await this.identitiesService.model.findOneAndUpdate(
          {
            ...lcs.rules,
            _id: after._id,
            ignoreLifecycle: { $ne: true },
          },
          {
            $set: {
              ...lcs.mutation,
              lifecycle: lcs.target,
              lastLifecycleUpdate: new Date(),
            },
          },
          {
            new: true, // Return the updated document
            upsert: false, // Do not create a new document if no match is found
          }
        )

        if (!res) {
          this.logger.debug(`No identity found matching rules for lifecycle <${after.lifecycle}>`)
          continue
        }

        await this.create({
          refId: after._id,
          lifecycle: lcs.target,
          date: new Date(),
        })

        const identities = res._id ? [res._id] : []
        await this.backendsService.lifecycleChangedIdentities(identities)

        this.logger.log(`Identity <${res._id}> updated to lifecycle <${lcs.target}> based on rules from source <${after.lifecycle}>`)
        return
      }
    }
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
