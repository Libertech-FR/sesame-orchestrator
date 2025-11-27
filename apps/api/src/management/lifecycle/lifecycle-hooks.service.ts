import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema'
import { Lifecycle } from './_schemas/lifecycle.schema'
import { Model } from 'mongoose'
import { IdentitiesCrudService } from '../identities/identities-crud.service'
import { BackendsService } from '~/core/backends/backends.service'
import { SchedulerRegistry } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { LifecycleStateDTO } from './_dto/config-states.dto'
import { ConfigRulesObjectIdentitiesDTO, ConfigRulesObjectSchemaDTO } from './_dto/config-rules.dto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { isConsoleEntrypoint } from '~/_common/functions/is-cli'
import { CronJob } from 'cron'
import dayjs from 'dayjs'
import { loadLifecycleRules } from './_functions/load-lifecycle-rules.function'
import { loadCustomStates } from './_functions/load-custom-states.function'
import { OnEvent } from '@nestjs/event-emitter'
import { Identities } from '../identities/_schemas/identities.schema'
import { AbstractLifecycleService } from './_abstracts/abstract.lifecycle.service'

@Injectable()
export class LifecycleHooksService extends AbstractLifecycleService {
  private _lastLifecycleCacheRefresh?: number
  
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
  public async onModuleInit(): Promise<void> {
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

    this.logger.log('LifecycleService (hooks) initialized')
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

    // Initialisation / rafraîchissement du cache (règles, états, sources)
    const lifecycleRules = await this.refreshLifecycleCache()
    this._lastLifecycleCacheRefresh = Date.now()

    this.logger.debug('Lifecycle sources loaded:', JSON.stringify(this.lifecycleSources, null, 2))

    if (isConsoleEntrypoint()) {
      this.logger.debug('Skipping LifecycleService bootstrap in console mode.')
      return
    }

    const cronExpression = this.configService.get<string>('lifecycle.triggerCronExpression') || '*/5 * * * *'
    const job = new CronJob(cronExpression, this.handleCron.bind(this, { lifecycleRules }))
    this.schedulerRegistry.addCronJob(`lifecycle-trigger`, job)
    this.logger.warn(`Lifecycle trigger cron job scheduled with expression: <${cronExpression}>`)

    job.addCallback(async (): Promise<void> => {
      // check cache yml files before logging
      await this.refreshLifecycleCache().catch((err) => {
        this.logger.error('Error while refreshing lifecycle cache in cron callback', err?.message, err?.stack)
      })

      const now = dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss')
      this.logger.debug(`Lifecycle trigger cron job executed at <${now}> !`)

      const nextDate = dayjs(job.nextDate().toJSDate()).format('YYYY-MM-DD HH:mm:ss')
      this.logger.verbose(`Next execution at <${nextDate}>`)
    })
    job.start()

    this.logger.log('LifecycleService bootstraped')
  }

  /**
   * Rafraîchit le cache des règles et des états de cycle de vie
   *
   * Charge les règles depuis les fichiers YAML, les états personnalisés
   * et reconstruit la map `lifecycleSources` pour un accès rapide.
   *
   * @returns {Promise<ConfigRulesObjectSchemaDTO[]>} Les règles de cycle de vie chargées
   */
  private async refreshLifecycleCache(): Promise<ConfigRulesObjectSchemaDTO[]> {
    const lifecycleRules = await loadLifecycleRules()
    const { customStates, stateFileAge } = await loadCustomStates()

    // Met à jour le cache interne
    this.customStates = customStates
    this._stateFileAge = stateFileAge

    // Reconstruit la table des sources -> règles
    this.lifecycleSources = {}
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

    this.logger.debug('Lifecycle cache refreshed (sources, states, rules).')
    return lifecycleRules
  }

  /**
   * Garantit que le cache des règles/états est rafraîchi si le dernier refresh date de plus de TTL.
   * @param ttlMs Durée de validité du cache en millisecondes (par défaut 60s)
   * @returns Les règles actuelles (rechargées si nécessaire)
   */
  public async ensureLifecycleCacheFresh(ttlMs: number = 60_000): Promise<ConfigRulesObjectSchemaDTO[]> {
    const now = Date.now()
    if (!this._lastLifecycleCacheRefresh || (now - this._lastLifecycleCacheRefresh) > ttlMs) {
      const rules = await this.refreshLifecycleCache()
      this._lastLifecycleCacheRefresh = now
      this.logger.verbose(`Lifecycle hooks cache ensured (TTL=${ttlMs}ms).`)
      return rules
    }
    return await loadLifecycleRules() // return current rules from files without rebuilding sources
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
}
