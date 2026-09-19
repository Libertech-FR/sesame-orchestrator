import { AbstractIdentitiesService } from '~/management/identities/abstract-identities.service';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import {
  Document,
  FilterQuery,
  ModifyResult,
  MongooseBaseQueryOptions,
  Query,
  QueryOptions,
  SaveOptions,
  Types,
  UpdateQuery,
} from 'mongoose';
import { ValidationConfigException, ValidationSchemaException } from '~/_common/errors/ValidationException';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { Identities } from '~/management/identities/_schemas/identities.schema';
import { BadRequestException, HttpException } from '@nestjs/common';
import { CountOptions } from 'mongodb';
import { IdentityLifecycleDefault, IdentityLifecycleState } from './_enums/lifecycle.enum';
import { IdentitySyncMode } from '~/config';

export const COUNT_ALL_MAX_ITERATIONS = 500;

export class IdentitiesCrudService extends AbstractIdentitiesService {
  public async create<T extends AbstractSchema | Document>(
    data?: any,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    data = this.transformNullsToString(data);

    const logPrefix = `Validation [${data.inetOrgPerson.cn}]:`;
    try {
      this.logger.log(`${logPrefix} Starting additionalFields transformation.`);
      if (data.hasOwnProperty('metadata')) {
        //suppresion de la clé metadata
        delete data.metadata;
      }

      await this._validation.transform(data.additionalFields || {});

      const validationsAdFields = await this._validation.validate(data.additionalFields || {});

      this.logger.log(`${logPrefix} AdditionalFields validation successful.`);
      this.logger.log(`Validations Additional fields: ${validationsAdFields}`);
    } catch (error) {
      console.log(error);
      if (error instanceof ValidationConfigException) {
        this.logger.error(`${logPrefix} Validation config error. ${JSON.stringify(error.getValidations())}`);
        throw new ValidationConfigException(error.getPayload());
      }
      if (error instanceof ValidationSchemaException) {
        this.logger.warn(`${logPrefix} Validation create schema error. ${JSON.stringify(error.getValidations())}`);
        data.additionalFields.validations = error.getValidations();
        throw new ValidationSchemaException(error.getPayload());
      } else {
        this.logger.error(`${logPrefix} Unhandled error: ${error.message}`);
        throw error; // Rethrow the original error if it's not one of the handled types.
      }
    }

    await this.checkInetOrgPersonJpegPhoto(data);
    if ((await this.checkMailAndUid(data)) === false) {
      this.logger.error('Uid ou mail déjà présent dans une autre identité');
      throw new HttpException('Uid ou mail déjà présent dans une autre identité', 400);
    }
    this.logger.log(`${logPrefix} Starting inetOrgPerson validation.`);
    const check = {
      objectClasses: ['inetOrgPerson'],
      attributes: { inetOrgPerson: data.inetOrgPerson },
    };
    //pour la validation le employeeNumber doit exister on en met un avec une valeur par defaut
    check.attributes.inetOrgPerson.employeeNumber = ['1'];
    const validations = await this._validation.validate(check);

    // En mode <auto> (SESAME_IDENTITY_SYNC_MODE), l'identité est synchronisée dès sa création,
    // sans passer par l'étape de validation manuelle.
    const autoSync = this.isAutoSyncEnabled() && (data.state === undefined || data.state === IdentityState.TO_CREATE);
    if (autoSync) {
      data.state = IdentityState.TO_SYNC;
    }

    const created: Document<T, any, T> = await super.create(data, options);

    if (autoSync) {
      await this.triggerAutoSync(created._id);
    }

    return created;
  }

  public async update<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    update: UpdateQuery<T>,
    options?: QueryOptions<T> & { rawResult: true },
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    update = this.transformNullsToString(update);
    // noinspection UnnecessaryLocalVariableJS

    //TODO : add validation logic here
    const logPrefix = `Validation [${update.inetOrgPerson.cn}]:`;
    try {
      this.logger.log(`${logPrefix} Starting additionalFields transformation.`);
      if (update.hasOwnProperty('metadata')) {
        //suppresion de la clé metadata
        delete update.metadata;
      }

      await this._validation.transform(update.additionalFields);

      this.logger.log(`${logPrefix} Starting inetOrgPerson validation.`);
      const check = {
        objectClasses: ['inetOrgPerson'],
        attributes: { inetOrgPerson: update.inetOrgPerson },
      };
      const validationsInetOrg = await this._validation.validate(check);
      const validationsAdFields = await this._validation.validate(update.additionalFields);

      this.logger.log(`${logPrefix} AdditionalFields validation successful.`);
      this.logger.log(`Validations InetOrgPerson: ${validationsInetOrg}`);
      this.logger.log(`Validations Additional fields: ${validationsAdFields}`);
    } catch (error) {
      console.log(error);
      if (error instanceof ValidationConfigException) {
        this.logger.error(`${logPrefix} Validation config error. ${JSON.stringify(error.getValidations())}`);
        throw new ValidationConfigException(error.getPayload());
      }
      if (error instanceof ValidationSchemaException) {
        this.logger.warn(`${logPrefix} Validation update schema error. ${JSON.stringify(error.getValidations())}`);
        update.additionalFields.validations = error.getValidations();
        throw new ValidationSchemaException(error.getPayload());
      } else {
        this.logger.error(`${logPrefix} Unhandled error: ${error.message}`);
        throw error; // Rethrow the original error if it's not one of the handled types.
      }
    }
    // check mail and Uid
    if ((await this.checkMailAndUid(update)) === false) {
      this.logger.error('Uid ou mail déjà présent dans une autre identité');
      throw new HttpException('Uid ou mail déjà présent dans une autre identité', 400);
    }
    // if (update.state === IdentityState.TO_COMPLETE) {
    // En mode <auto> (SESAME_IDENTITY_SYNC_MODE), l'identité est synchronisée sans validation manuelle.
    const autoSync = this.isAutoSyncEnabled();
    update = { ...update, state: autoSync ? IdentityState.TO_SYNC : IdentityState.TO_VALIDATE };

    await this.checkInetOrgPersonJpegPhoto(update);

    // }
    // if (update.state === IdentityState.SYNCED) {
    //   update = { ...update, state: IdentityState.TO_VALIDATE };
    // }
    //update.state = IdentityState.TO_VALIDATE;
    const updated = await super.update(_id, update, options);
    const identity = await this.generateFingerprint<T>(updated as unknown as Identities);

    if (autoSync) {
      await this.triggerAutoSync(_id);
    }

    return identity;
  }

  /**
   * Indique si la synchronisation automatique après modification est activée
   *
   * @returns true si SESAME_IDENTITY_SYNC_MODE vaut <auto>, false en mode manuel (défaut)
   */
  protected isAutoSyncEnabled(): boolean {
    return this.config.get<IdentitySyncMode>('identities.syncMode') === 'auto';
  }

  /**
   * Déclenche la synchronisation vers les backends d'une identité modifiée
   *
   * @description Une erreur de synchronisation n'invalide pas la modification : l'identité reste
   * en état TO_SYNC et pourra être resynchronisée manuellement ou par un syncall.
   * @param _id - Identifiant de l'identité à synchroniser
   */
  protected async triggerAutoSync(_id: Types.ObjectId | any): Promise<void> {
    try {
      await this.backends.syncIdentities([`${_id}`], {
        async: true,
        // L'identité bascule en PROCESSING dès la mise en file : elle n'apparaît pas
        // dans les <identités à synchroniser> en attente d'une action manuelle.
        switchToProcessing: true,
        comment: 'Synchronisation automatique après modification',
      });
      this.logger.log(`Auto sync triggered for identity <${_id}>`);
    } catch (error) {
      this.logger.error(`Auto sync failed for identity <${_id}>: ${error?.message}`, error?.stack);
    }
  }

  public async updateLifecycle<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    lifecycle: IdentityLifecycleDefault | string,
    options?: QueryOptions<T> & { rawResult: true },
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    const updated = await super.update(
      _id,
      {
        lifecycle,
        lastLifecycleUpdate: new Date(),
      },
      options,
    );
    return updated;
  }

  public async updateState<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    state: IdentityState,
    options?: QueryOptions<T> & { rawResult: true },
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    const updated = await super.update(_id, { state }, options);
    return updated;
  }

  public async updateStateMany<T extends AbstractSchema | Document>(body: {
    ids: Types.ObjectId[];
    targetState: IdentityState;
    originState: IdentityState;
  }): Promise<ModifyResult<Query<T, T, any, T>>[]> {
    const identities = await this._model.find({ _id: { $in: body.ids } }).exec();
    if (identities.some((identity) => identity.state !== body.originState)) {
      // throw new HttpException("Toutes les identités ne sont pas dans l'état attendu.", 400);
      this.logger.warn(
        "Toutes les identités ne sont pas dans l'état attendu." +
          JSON.stringify(identities.map((i) => ({ id: i._id, state: i.state }))),
      );
    }

    if (identities.length === 0) {
      throw new HttpException('Aucune identité trouvée.', 404);
    }

    const updated = await Promise.all(
      identities.map((identity) => {
        return this.updateState(identity._id, body.targetState, { rawResult: true });
      }),
    );

    return updated as any;
  }
  //Attention le front appelle backend/delete pour deleter l identite. La methode ci dessous n est pas utilisée
  public async delete<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<Query<T, T, any, T>> {
    // noinspection UnnecessaryLocalVariableJS
    const deleted = await super.delete(_id, options);
    return deleted;
  }

  public async countAll<T extends AbstractSchema | Document>(
    filters: {
      [key: string]: FilterQuery<T>;
    },
    options?: (CountOptions & MongooseBaseQueryOptions<T>) | null,
  ) {
    if (Object.keys(filters).length >= COUNT_ALL_MAX_ITERATIONS) {
      throw new BadRequestException(`Too many filters (max: ${COUNT_ALL_MAX_ITERATIONS})`);
    }

    const entries = Object.entries(filters);
    const results = await Promise.all(
      entries.map(([key, filter]) =>
        this._model
          .countDocuments(
            {
              ...filter,
              deletedFlag: { $ne: true },
            },
            options as any,
          )
          .then((count) => [key, count]),
      ),
    );

    return Object.fromEntries(results);
  }
}
