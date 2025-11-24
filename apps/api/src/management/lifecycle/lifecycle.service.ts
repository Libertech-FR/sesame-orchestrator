import { Injectable, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import { validateOrReject, ValidationError } from 'class-validator';
import { CronJob } from 'cron';
import { Model, Query, Types } from 'mongoose';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { FilterOptions } from '~/_common/restools';
import { Identities } from '../identities/_schemas/identities.schema';
import { IdentitiesCrudService } from '../identities/identities-crud.service';
import { ConfigRulesObjectIdentitiesDTO, ConfigRulesObjectSchemaDTO } from './_dto/config-rules.dto';
import { ConfigStatesDTO, LifecycleStateDTO } from './_dto/config-states.dto';
import { IdentityLifecycleDefault, IdentityLifecycleDefaultList, IdentityLifecycleState } from '../identities/_enums/lifecycle.enum';
import { Lifecycle, LifecycleRefId } from './_schemas/lifecycle.schema';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import { isConsoleEntrypoint } from '~/_common/functions/is-cli';

interface LifecycleSource {
  [source: string]: Partial<ConfigRulesObjectIdentitiesDTO>[];
}

@Injectable()
export class LifecycleService extends AbstractServiceSchema implements OnApplicationBootstrap, OnModuleInit {
  protected lifecycleSources: LifecycleSource = {};

  protected customStates: LifecycleStateDTO[] = [];

  protected _stateFileAge = 0;

  public constructor(
    @InjectModel(Lifecycle.name) protected _model: Model<Lifecycle>,
    protected readonly identitiesService: IdentitiesCrudService,
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
  ) {
    super();
  }

  public get stateFileAge(): number {
    return this._stateFileAge;
  }

  /**
   * Initialize the LifecycleService
   *
   * This method is called when the module is initialized.
   * It reads the lifecycle validation files from the `configs/lifecycle` directory and copies default files from `defaults/lifecycle` if they do not exist.
   * It logs the initialization process and any errors encountered during file reading or copying.
   */
  public onModuleInit(): void {
    let files = [];
    let filesRules = [];
    let defaultFiles = [];
    let defaultFilesRules = [];

    this.logger.verbose('Initializing LifecycleService...');

    try {
      files = readdirSync(`${process.cwd()}/configs/lifecycle`);
      defaultFiles = readdirSync(`${process.cwd()}/defaults/lifecycle`);

      filesRules = readdirSync(`${process.cwd()}/configs/lifecycle/rules`);
      defaultFilesRules = readdirSync(`${process.cwd()}/defaults/lifecycle/rules`);
    } catch (error) {
      this.logger.error('Error reading lifecycle validations files', error.message, error.stack);
    }

    for (const file of defaultFiles) {
      if (!files.includes(file)) {
        try {
          const defaultFile = readFileSync(`${process.cwd()}/defaults/lifecycle/${file}`, 'utf-8');
          writeFileSync(`${process.cwd()}/configs/lifecycle/${file}`, defaultFile);
          this.logger.warn(`Copied default validation file: ${file}`);
        } catch (error) {
          this.logger.error(`Error copying default validation file: ${file}`, error.message, error.stack);
        }
      }
    }

    if (files.length === 0) {
      for (const file of defaultFilesRules) {
        if (!files.includes(file)) {
          try {
            const defaultFile = readFileSync(`${process.cwd()}/defaults/lifecycle/rules/${file}`, 'utf-8');
            writeFileSync(`${process.cwd()}/configs/lifecycle/rules/${file}`, defaultFile);
            this.logger.warn(`Copied default validation file: ${file}`);
          } catch (error) {
            this.logger.error(`Error copying default validation file: ${file}`, error.message, error.stack);
          }
        }
      }
    }

    this.logger.log('LifecycleService initialized');
  }

  /**
   * Bootstrap the LifecycleService application
   *
   * This method is called when the application starts.
   * It loads lifecycle rules from configuration files and creates a map of lifecycle sources.
   * The map will help to quickly find which identities are associated with each lifecycle source.
   * It also logs the lifecycle sources for debugging purposes.
   */
  public async onApplicationBootstrap(): Promise<void> {
    this.logger.verbose('Bootstrap LifecycleService application...');

    const lifecycleRules = await this.loadLifecycleRules();
    await this.loadCustomStates();

    for (const lfr of lifecycleRules) {
      for (const idRule of lfr.identities) {
        for (const source of idRule.sources) {
          if (!this.lifecycleSources[source]) {
            this.lifecycleSources[source] = [];
          }
          this.lifecycleSources[source].push(idRule);
        }
      }
    }

    this.logger.debug('Lifecycle sources loaded:', JSON.stringify(this.lifecycleSources, null, 2));

    if (isConsoleEntrypoint) {
      this.logger.debug('Skipping LifecycleService bootstrap in console mode.');
      return;
    }

    const cronExpression = this.configService.get<string>('lifecycle.triggerCronExpression') || '*/5 * * * *';
    const job = new CronJob(cronExpression, this.handleCron.bind(this, { lifecycleRules }));
    this.schedulerRegistry.addCronJob(`lifecycle-trigger`, job);
    this.logger.warn(`Lifecycle trigger cron job scheduled with expression: <${cronExpression}>`);

    job.addCallback(async (): Promise<void> => {
      const now = dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss');
      this.logger.debug(`Lifecycle trigger cron job executed at <${now}> !`);

      const nextDate = dayjs(job.nextDate().toJSDate()).format('YYYY-MM-DD HH:mm:ss');
      this.logger.verbose(`Next execution at <${nextDate}>`);
    });
    job.start();

    this.logger.log('LifecycleService bootstraped');
  }

  public async listLifecycles(): Promise<any> {
    const lifecycles = this.lifecycleSources ? Object.keys(this.lifecycleSources) : [];
    return this.lifecycleSources;
  }

  private async handleCron({ lifecycleRules }: { lifecycleRules: ConfigRulesObjectSchemaDTO[] }): Promise<void> {
    this.logger.debug(`Running lifecycle trigger cron job...`);

    for (const lfr of lifecycleRules) {
      for (const idRule of lfr.identities) {
        if (idRule.trigger) {
          const dateKey = idRule.dateKey || 'lastLifecycleUpdate';

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
            });
            this.logger.log(`Found ${identities.length} identities to process for trigger in source <${idRule.sources}>`);
            this.logger.verbose(`identities process triggered`, JSON.stringify(idRule, null, 2));

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
              );

              if (updated) {
                await this.create({
                  refId: identity._id,
                  lifecycle: idRule.target,
                  date: new Date(),
                });

                this.logger.log(`Identity <${identity._id}> updated to lifecycle <${idRule.target}> by trigger from source <${idRule.sources}>`);
              }
            }

          } catch (error) {
            this.logger.error(`Error in lifecycle trigger job for source <${idRule.sources}>:`, error.message, error.stack);
          }
        }
      }
    }

    this.logger.log(`Lifecycle trigger cron job completed.`);
  }

  /**
   * Load lifecycle rules from configuration files
   *
   * This method reads all YAML files from the `configs/lifecycle` directory,
   * parses them into DTOs, validates them, and stores them in the `lifecycleRules` array.
   * It logs the process of loading and validating each file, and handles any errors that occur during file reading or validation.
   */
  private async loadLifecycleRules(): Promise<ConfigRulesObjectSchemaDTO[]> {
    let files: string[] = [];

    const lifecycleRules: ConfigRulesObjectSchemaDTO[] = [];
    this.logger.verbose('Loading lifecycle rules from configuration files...');
    this.logger.verbose('Initializing LifecycleService...');

    try {
      files = readdirSync(`${process.cwd()}/configs/lifecycle/rules`);
    } catch (error) {
      this.logger.error('Error reading lifecycle files', error.message, error.stack);
    }

    for (const file of files) {
      let schema: ConfigRulesObjectSchemaDTO;
      if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
        this.logger.warn(`Skipping non-YAML file: ${file}`);
        continue;
      }

      try {
        const data = readFileSync(`${process.cwd()}/configs/lifecycle/rules/${file}`, 'utf-8');
        this.logger.debug(`Loaded lifecycle config: ${file}`);
        const yml = parse(data)
        schema = plainToInstance(ConfigRulesObjectSchemaDTO, yml)

      } catch (error) {
        this.logger.error(`Error loading lifecycle config file: ${file}`, error.message, error.stack);
        continue;
      }

      if (!schema || !schema.identities || !Array.isArray(schema.identities)) {
        this.logger.error(`Invalid schema in file: ${file}`);
        continue;
      }

      try {
        this.logger.verbose(`Validating schema for file: ${file}`, JSON.stringify(schema, null, 2));
        await validateOrReject(schema, {
          whitelist: true,
        })
        this.logger.debug(`Validated schema for file: ${file}`);
      } catch (errors) {
        const formattedErrors = this.formatValidationErrors(errors, file);
        const err = new Error(`Validation errors in file '${file}':\n${formattedErrors}`);
        throw err;
      }

      lifecycleRules.push(schema);
      this.logger.debug(`Lifecycle activated from file: ${file}`);
    }

    this.logger.log(`Loaded <${lifecycleRules.length}> lifecycle rules from configuration files.`);
    return lifecycleRules;
  }

  /**
   * Load custom lifecycle states from states.yml configuration file
   *
   * This method reads the states.yml file from the `configs/lifecycle` directory,
   * parses it into a DTO, validates it, and stores the custom states.
   * It logs the process of loading and validating the file, and handles any errors that occur during file reading or validation.
   */
  private async loadCustomStates(): Promise<LifecycleStateDTO[]> {
    const customStates: LifecycleStateDTO[] = [];
    this.logger.verbose('Loading custom lifecycle states from states.yml...');

    try {
      const statesFilePath = `${process.cwd()}/configs/lifecycle/states.yml`;
      const data = readFileSync(statesFilePath, 'utf-8');
      const { mtimeMs } = statSync(statesFilePath);
      this._stateFileAge = mtimeMs;
      this.logger.debug('Loaded custom states config: states.yml');

      const yml = parse(data);
      const configStates = plainToInstance(ConfigStatesDTO, yml);

      if (!configStates || !configStates.states || !Array.isArray(configStates.states)) {
        this.logger.error('Invalid schema in states.yml file');
        return customStates;
      }

      try {
        this.logger.verbose('Validating schema for states.yml', JSON.stringify(configStates, null, 2));
        await validateOrReject(configStates, {
          whitelist: true,
        });
        this.logger.debug('Validated schema for states.yml');
      } catch (errors) {
        const formattedErrors = this.formatValidationErrors(errors, 'states.yml');
        const err = new Error(`Validation errors in states.yml:\n${formattedErrors}`);
        throw err;
      }

      // Valider que chaque clé est unique et d'une seule lettre
      const usedKeys = new Set<string>();
      for (const state of configStates.states) {
        if (state.key.length !== 1) {
          throw new Error(`State key '${state.key}' must be exactly one character`);
        }

        if (usedKeys.has(state.key)) {
          throw new Error(`Duplicate state key '${state.key}' found in states.yml`);
        }

        // Vérifier que la clé n'existe pas déjà dans l'enum par défaut
        if (Object.values(IdentityLifecycleDefault).includes(state.key as IdentityLifecycleDefault)) {
          throw new Error(`State key '${state.key}' conflicts with default lifecycle state`);
        }

        usedKeys.add(state.key);
        customStates.push(state);
      }

      this.customStates = customStates;
      this.logger.log(`Loaded <${customStates.length}> custom lifecycle states from states.yml`);

    } catch (error) {
      this.logger.error('Error loading custom states from states.yml', error.message, error.stack);
    }

    return customStates;
  }

  /**
   * Get all available lifecycle states (default enum + custom states)
   *
   * This method combines the default lifecycle states from the enum with custom states loaded from states.yml.
   * It returns an array of all available states with their keys, labels, and descriptions.
   *
   * @returns An array containing all available lifecycle states
   */
  public getAllAvailableStates(): Array<IdentityLifecycleState> {
    const allStates: Array<IdentityLifecycleState> = [
      ...IdentityLifecycleDefaultList,
      ...this.customStates,
    ];

    return allStates;
  }

  /**
   * Get all available lifecycle state keys
   *
   * This method returns only the keys of all available lifecycle states.
   *
   * @returns An array of all available lifecycle state keys
   */
  public getAllAvailableStateKeys(): string[] {
    const defaultKeys = Object.values(IdentityLifecycleDefault);
    const customKeys = this.customStates.map(state => state.key);

    return [...defaultKeys, ...customKeys];
  }

  /**
   * Get only custom lifecycle states
   *
   * This method returns the list of custom lifecycle states loaded from states.yml,
   * excluding the default states from the enum.
   *
   * @returns An array of custom lifecycle states with their details
   */
  public getCustomStates(): IdentityLifecycleState[] {
    return [...this.customStates];
  }

  /**
   * Get only custom lifecycle state keys
   *
   * This method returns only the keys of custom lifecycle states.
   *
   * @returns An array of custom lifecycle state keys
   */
  public getCustomStateKeys(): string[] {
    return this.customStates.map(state => state.key);
  }

  /**
   * Format validation errors for better readability
   *
   * @param errors - Array of ValidationError objects from class-validator
   * @param file - The file name where the validation failed
   * @returns A formatted error message string
   */
  private formatValidationErrors(errors: ValidationError[], file: string, basePath: string = '', isInArrayContext: boolean = false): string {
    const formatError = (error: ValidationError, currentPath: string, inArrayContext: boolean): string[] => {
      let propertyPath = currentPath;

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
          propertyPath = currentPath ? `${currentPath}[${error.property}]` : `[${error.property}]`;
        } else {
          // C'est une propriété normale
          propertyPath = currentPath ? `${currentPath}.${error.property}` : error.property;
        }
      }

      const errorMessages: string[] = [];

      /**
       * Check if error.constraints is defined and not empty.
       * If it is, we iterate over each constraint and format the error message.
       */
      if (error.constraints) {
        Object.entries(error.constraints).forEach(([constraintKey, message]) => {
          errorMessages.push(`Property '${propertyPath}': ${message} (constraint: ${constraintKey})`);
        });
      }

      /**
       * If the error has children, we recursively format each child error.
       * We check if the error has children and if they are defined.
       */
      if (error.children && error.children.length > 0) {
        const isNextLevelArray = Array.isArray(error.value);
        error.children.forEach(childError => {
          errorMessages.push(...formatError(childError, propertyPath, isNextLevelArray));
        });
      }

      return errorMessages;
    };

    const allErrorMessages: string[] = [];
    errors.forEach(error => {
      allErrorMessages.push(...formatError(error, basePath, isInArrayContext));
    });

    return allErrorMessages.map(msg => `• ${msg}`).join('\n');
  }

  /**
   * Handle identity update events
   * This method listens for events emitted after an identity is updated.
   * It checks if the identity has a valid ID and then processes the lifecycle event.
   * If the identity's lifecycle has changed, it creates a new lifecycle event.
   * It also logs the event handling process, including any warnings if the identity data is invalid.
   * This method is triggered by the 'management.identities.service.afterUpdate' event.
   *
   * @param event - The event containing the identity update data
   * @returns A promise that resolves when the lifecycle event is created
   */
  @OnEvent('management.identities.service.afterUpdate')
  public async handle(event: { updated: Identities, before?: Identities }): Promise<void> {
    this.logger.verbose(`Handling identity update event for identity <${event.updated._id}>`);

    if (!event.updated || !event.updated._id) {
      this.logger.warn('No valid identity found in event data');
      return;
    }

    await this.fireLifecycleEvent(event.before, event.updated);
  }

  /**
   * Handle identity upsert events
   * This method listens for events emitted after an identity is upserted.
   * It checks if the identity has a valid ID and then processes the lifecycle event.
   * If the identity's lifecycle has changed, it creates a new lifecycle event.
   * It also logs the event handling process, including any warnings if the identity data is invalid.
   * This method is triggered by the 'management.identities.service.afterUpsert' event.
   *
   * @param event - The event containing the identity upsert data
   * @returns A promise that resolves when the lifecycle event is created
   */
  @OnEvent('management.identities.service.afterUpsert')
  public async handleOrderCreatedEvent(event: { result: Identities, before?: Identities }): Promise<void> {
    this.logger.verbose(`Handling identity upsert event for identity <${event.result._id}>`);

    if (!event.result || !event.result._id) {
      this.logger.warn('No valid identity found in event data');
      return;
    }

    await this.fireLifecycleEvent(event.before, event.result);
  }

  /**
   * Fire a lifecycle event
   * This method is responsible for processing the lifecycle event for a given identity.
   * It checks if the lifecycle has changed and creates a new lifecycle event if necessary.
   * It also processes the lifecycle sources associated with the new lifecycle.
   * If the lifecycle has changed, it updates the identity's lifecycle based on the rules defined in the lifecycle sources.
   * It logs the lifecycle event processing and any updates made to the identity.
   * This method is called when an identity's lifecycle changes.
   *
   * @param before - The identity data before the update
   * @param after - The identity data after the update
   * @returns A promise that resolves when the lifecycle event is processed
   */
  private async fireLifecycleEvent(before: Identities, after: Identities): Promise<void> {
    if (before.lifecycle !== after.lifecycle) {
      await this.create({
        refId: after._id,
        lifecycle: after.lifecycle,
        date: new Date(),
      });
      this.logger.debug(`Lifecycle event manualy recorded for identity <${after._id}>: ${after.lifecycle}`);
      // If the lifecycle has changed, we need to process the new lifecycle
    }

    if (this.lifecycleSources[after.lifecycle]) {
      this.logger.debug(`Processing lifecycle sources for identity <${after._id}> with lifecycle <${after.lifecycle}>`);

      for (const lcs of this.lifecycleSources[after.lifecycle]) {
        this.logger.verbose(`Processing lifecycle source <${after.lifecycle}> with rules: ${JSON.stringify(lcs.rules)}`);

        if (lcs.trigger) {
          this.logger.debug(`Skipping lifecycle source <${after.lifecycle}> with trigger: ${lcs.trigger}`);
          continue; // Skip processing if it's a trigger-based rule
        }

        const res = await this.identitiesService.model.findOneAndUpdate(
          {
            ...lcs.rules,
            _id: after._id,
            ignoreLifecycle: { $ne: true },
          },
          {
            $set: {
              lifecycle: lcs.target,
              lastLifecycleUpdate: new Date(),
            },
          },
          {
            new: true, // Return the updated document
            upsert: false, // Do not create a new document if no match is found
          }
        );

        if (!res) {
          this.logger.debug(`No identity found matching rules for lifecycle <${after.lifecycle}>`);
          continue;
        }

        await this.create({
          refId: after._id,
          lifecycle: lcs.target,
          date: new Date(),
        });

        this.logger.log(`Identity <${res._id}> updated to lifecycle <${lcs.target}> based on rules from source <${after.lifecycle}>`);
        return;
      }
    }
  }

  /**
   * Get lifecycle history for a specific identity
   *
   * @param refId - The ID of the identity to retrieve lifecycle history for
   * @returns An array of lifecycle events for the specified identity, sorted by creation date in descending order
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
    });
    const total = await this.count({ refId });

    return [total, result];
  }

  /**
   * Get lifecycle statistics
   * This method aggregates lifecycle events by their type and counts the occurrences.
   * It returns an array of objects where each object contains the lifecycle type and the count of occurrences.
   *
   * @returns An array of lifecycle statistics, each containing the lifecycle type and count
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
    ]);

    return stats;
  }

  /**
   * Get recent lifecycle changes
   * This method retrieves the most recent lifecycle changes, sorted by creation date in descending order.
   * It allows for pagination through the `skip` and `limit` options.
   *
   * @param options - Optional parameters for filtering, sorting, and pagination
   * @returns A promise that resolves to an array of lifecycle changes, each containing the lifecycle event details
   */
  public async getRecentChanges(
    options?: FilterOptions,
  ): Promise<[number, Query<Array<Lifecycle>, Lifecycle, any, Lifecycle>[]]> {
    const total = await this.count({});
    const result = await this.find<Lifecycle>({}, null, {
      populate: 'refId',
      sort: {
        ...options?.sort,
        createdAt: -1,
      },
      skip: options?.skip || 0,
      limit: options?.limit || 100,
    });

    return [total, result];
  }
}
