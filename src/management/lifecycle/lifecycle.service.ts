import { Injectable, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { FilterOptions } from '@the-software-compagny/nestjs_module_restools';
import { Model, Query, Types } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { Identities } from '../identities/_schemas/identities.schema';
import { Lifecycle } from './_schemas/lifecycle.schema';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { plainToInstance } from 'class-transformer';
import { ConfigObjectIdentitiesDTO, ConfigObjectSchemaDTO } from './_dto/config.dto';
import { validateOrReject } from 'class-validator';
import { IdentityLifecycle } from '../identities/_enums/lifecycle.enum';
import { omit } from 'radash';

interface LifecycleSource {
  [source: IdentityLifecycle | string]: Partial<ConfigObjectIdentitiesDTO>[];
}

@Injectable()
export class LifecycleService extends AbstractServiceSchema implements OnApplicationBootstrap, OnModuleInit {
  protected lifecycleSources: LifecycleSource = {};

  public constructor(@InjectModel(Lifecycle.name) protected _model: Model<Lifecycle>) {
    super();
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
    let defaultFiles = [];

    this.logger.verbose('Initializing LifecycleService...');

    try {
      files = readdirSync(`${process.cwd()}/configs/lifecycle`);
      defaultFiles = readdirSync(`${process.cwd()}/defaults/lifecycle`);
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

    /**
     * Create a map of lifecycle sources
     * This map will help to quickly find which identities are associated with each lifecycle source.
     * It will be used to optimize the lifecycle processing logic.
     * The structure will be:
     * {
     *   'source1': [identityRule1, identityRule2, ...],
     *   'source2': [identityRule3, identityRule4, ...],
     *   ...
     * }
     * This will allow us to quickly access all identity rules associated with a specific lifecycle source.
     */
    for (const lfr of lifecycleRules) {
      for (const idRule of lfr.identities) {
        for (const source of idRule.sources) {
          if (!this.lifecycleSources[source]) {
            this.lifecycleSources[source] = [];
          }
          this.lifecycleSources[source].push(omit(idRule, ['sources'])); // Exclude sources from the stored rules
        }
      }
    }

    this.logger.log('LifecycleService bootstraped');
  }

  /**
   * Load lifecycle rules from configuration files
   *
   * This method reads all YAML files from the `configs/lifecycle` directory,
   * parses them into DTOs, validates them, and stores them in the `lifecycleRules` array.
   * It logs the process of loading and validating each file, and handles any errors that occur during file reading or validation.
   */
  private async loadLifecycleRules(): Promise<ConfigObjectSchemaDTO[]> {
    const lifecycleRules: ConfigObjectSchemaDTO[] = [];
    this.logger.verbose('Loading lifecycle rules from configuration files...');

    for (const file of readdirSync(`${process.cwd()}/configs/lifecycle`)) {
      let schema: ConfigObjectSchemaDTO;
      if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
        this.logger.warn(`Skipping non-YAML file: ${file}`);
        continue;
      }

      try {
        const data = readFileSync(`${process.cwd()}/configs/lifecycle/${file}`, 'utf-8');
        this.logger.debug(`Loaded lifecycle config: ${file}`);
        const yml = parse(data)
        schema = plainToInstance(ConfigObjectSchemaDTO, yml)

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
        const err = new Error(`Validation failed for schema in file: ${file}`);
        err.message = errors.map((e) => e.toString()).join(', ') //TODO: improve error message
        throw err
      }

      lifecycleRules.push(schema);
      this.logger.debug(`Lifecycle activated from file: ${file}`);
    }

    this.logger.log(`Loaded <${lifecycleRules.length}> lifecycle rules from configuration files.`);
    return lifecycleRules;
  }

  /**
   * Handle identity upsert events
   * This method listens for events emitted after an identity is upserted.
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

    if (event.before && event.before.lifecycle !== event.result.lifecycle) {
      await this.create({
        refId: event.result._id,
        lifecycle: event.result.lifecycle,
        date: new Date(),
      });
      this.logger.debug(`Lifecycle event manualy recorded for identity <${event.result._id}>: ${event.result.lifecycle}`);
      return;
    }

    if (this.lifecycleSources[event.result.lifecycle]) {
      for (const rule of this.lifecycleSources[event.result.lifecycle]) {
        // TODO: changer le lifecycle de l'identité si la rule match avec un findOneAndUpdate

        // await this.create({
        //   refId: event.result._id,
        //   lifecycle: event.result.lifecycle,
        //   date: new Date(),
        // });
      }
    }
  }

  // TODO: implémenter l'event update pour les changements de lifecycle

  /**
   * Get lifecycle history for a specific identity
   *
   * @param refId - The ID of the identity to retrieve lifecycle history for
   * @returns An array of lifecycle events for the specified identity, sorted by creation date in descending order
   */
  public async getLifecycleHistory(
    refId: Types.ObjectId,
    options?: FilterOptions,
  ): Promise<Query<Array<Lifecycle>, Lifecycle, any, Lifecycle>[]> {
    const result = await this.find<Lifecycle>({ refId }, null, {
      populate: 'refId',
      sort: {
        ...options?.sort,
        createdAt: -1,
      },
      skip: options?.skip || 0,
      limit: options?.limit || 100,
    });

    return result;
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
  ): Promise<Query<Array<Lifecycle>, Lifecycle, any, Lifecycle>[]> {
    const result = await this.find<Lifecycle>({}, null, {
      populate: 'refId',
      sort: {
        ...options?.sort,
        createdAt: -1,
      },
      skip: options?.skip || 0,
      limit: options?.limit || 100,
    });

    return result;
  }
}
