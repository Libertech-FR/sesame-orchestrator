import { AbstractIdentitiesService } from '~/management/identities/abstract-identities.service';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { Document, FilterQuery, ModifyResult, MongooseBaseQueryOptions, Query, QueryOptions, SaveOptions, Types, UpdateQuery } from 'mongoose';
import { ValidationConfigException, ValidationSchemaException } from '~/_common/errors/ValidationException';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { Identities } from '~/management/identities/_schemas/identities.schema';
import { BadRequestException, HttpException } from '@nestjs/common';
import { CountOptions } from 'mongodb';
import { IdentityLifecycleDefault, IdentityLifecycleState } from './_enums/lifecycle.enum';

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
        delete (data.metadata);
      }

      await this._validation.transform(data.additionalFields || {});

      let validationsAdFields = await this._validation.validate(data.additionalFields || {});

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
    if (await this.checkMailAndUid(data) === false) {
      this.logger.error('Uid ou mail déjà présent dans une autre identité');
      throw new HttpException("Uid ou mail déjà présent dans une autre identité", 400);
    }
    this.logger.log(`${logPrefix} Starting inetOrgPerson validation.`);
    const check = {
      objectClasses: ['inetOrgPerson'],
      attributes: { 'inetOrgPerson': data.inetOrgPerson }
    }
    //pour la validation le employeeNumber doit exister on en met un avec une valeur par defaut
    check.attributes.inetOrgPerson.employeeNumber = ["1"];
    let validations = await this._validation.validate(check);
    const created: Document<T, any, T> = await super.create(data, options);
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
        delete (update.metadata);
      }

      await this._validation.transform(update.additionalFields);

      this.logger.log(`${logPrefix} Starting inetOrgPerson validation.`);
      const check = {
        objectClasses: ['inetOrgPerson'],
        attributes: { 'inetOrgPerson': update.inetOrgPerson }
      }
      let validationsInetOrg = await this._validation.validate(check);
      let validationsAdFields = await this._validation.validate(update.additionalFields);

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
    if (await this.checkMailAndUid(update) === false) {
      this.logger.error('Uid ou mail déjà présent dans une autre identité');
      throw new HttpException("Uid ou mail déjà présent dans une autre identité", 400);
    }
    // if (update.state === IdentityState.TO_COMPLETE) {
    update = { ...update, state: IdentityState.TO_VALIDATE };

    await this.checkInetOrgPersonJpegPhoto(update);

    // }
    // if (update.state === IdentityState.SYNCED) {
    //   update = { ...update, state: IdentityState.TO_VALIDATE };
    // }
    //update.state = IdentityState.TO_VALIDATE;
    const updated = await super.update(_id, update, options);
    //TODO: add backends service logic here (TO_SYNC)
    return await this.generateFingerprint(updated as unknown as Identities);
  }

  public async updateLifecycle<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    lifecycle: IdentityLifecycleDefault | string,
    options?: QueryOptions<T> & { rawResult: true },
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    const updated = await super.update(_id, { lifecycle }, options);
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
      throw new HttpException("Toutes les identités ne sont pas dans l'état attendu.", 400);
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

  public async countAll<T extends AbstractSchema | Document>(filters: {
    [key: string]: FilterQuery<T>;
  }, options?: (CountOptions & MongooseBaseQueryOptions<T>) | null) {
    if (Object.keys(filters).length >= COUNT_ALL_MAX_ITERATIONS) {
      throw new BadRequestException(`Too many filters (max: ${COUNT_ALL_MAX_ITERATIONS})`);
    }

    const entries = Object.entries(filters);
    const results = await Promise.all(entries.map(([key, filter]) =>
      this._model.countDocuments({
        ...filter,
        deletedFlag: { $ne: true },
      }, options).then(count => [key, count])
    ));

    return Object.fromEntries(results);
  }
}
