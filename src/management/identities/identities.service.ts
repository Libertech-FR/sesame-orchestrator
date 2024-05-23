import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Document,
  FilterQuery,
  Model,
  ModifyResult,
  Query,
  QueryOptions,
  SaveOptions,
  Types,
  UpdateQuery,
} from 'mongoose';
import { construct, omit } from 'radash';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { ValidationConfigException, ValidationSchemaException } from '~/_common/errors/ValidationException';
import { toPlainAndCrush } from '~/_common/functions/to-plain-and-crush';
import { IdentitiesUpsertDto } from './_dto/identities.dto';
import { IdentityState } from './_enums/states.enum';
import { Identities } from './_schemas/identities.schema';
import { IdentitiesValidationService } from './validations/identities.validation.service';

@Injectable()
export class IdentitiesService extends AbstractServiceSchema {
  constructor(
    @InjectModel(Identities.name) protected _model: Model<Identities>,
    protected readonly _validation: IdentitiesValidationService,
  ) {
    super();
  }

  public async create<T extends AbstractSchema | Document>(
    data?: any,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    const created: Document<T, any, T> = await super.create(data, options);
    return created;
    //TODO: add backends service logic here
  }

  public async upsert<T extends AbstractSchema | Document>(
    filters: FilterQuery<T>,
    data?: IdentitiesUpsertDto,
    options?: QueryOptions<T>,
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    this.logger.log(`Upserting identity with filters ${JSON.stringify(filters)}`);

    // const objectClasses = data.additionalFields.objectClasses;
    // delete data.additionalFields.objectClasses;
    const crushedUpdate = toPlainAndCrush(omit(data || {}, ['$setOnInsert']));
    const crushedSetOnInsert = toPlainAndCrush(data.$setOnInsert || {});
    // crushedUpdate['additionalFields.objectClasses'] = objectClasses;

    // console.log('crushedUpdate', crushedUpdate);
    // console.log('crushedSetOnInsert', crushedSetOnInsert);

    data = construct({
      ...crushedUpdate,
      ...crushedSetOnInsert,
    });
    data.additionalFields.validations = {};
    const logPrefix = `Validation [${data.inetOrgPerson.cn}]:`;

    try {
      this.logger.log(`${logPrefix} Starting additionalFields validation.`);
      const validations = await this._validation.validate(data.additionalFields);
      this.logger.log(`${logPrefix} AdditionalFields validation successful.`);
      this.logger.log(`Validations : ${JSON.stringify(validations)}`);
      crushedUpdate['state'] = IdentityState.TO_VALIDATE;
    } catch (error) {
      data = this.handleValidationError(error, data, logPrefix);
      crushedUpdate['state'] = data.state;
      crushedUpdate['additionalFields.validations'] = data.additionalFields.validations;
    }

    return await super.upsert(
      filters,
      {
        $set: crushedUpdate,
        $setOnInsert: crushedSetOnInsert,
      },
      options,
    );
  }

  // public async upsert<T extends AbstractSchema | Document>(
  //   data?: any,
  //   options?: QueryOptions<T>,
  // ): Promise<ModifyResult<Query<T, T, any, T>>> {
  //   Logger.log(`Upserting identity: ${JSON.stringify(data)}`);
  //   const logPrefix = `Validation [${data.inetOrgPerson.cn}]:`;
  //   // console.log(options);
  //   const identity = await this._model.findOne({
  //     'inetOrgPerson.employeeNumber': data.inetOrgPerson.employeeNumber,
  //     'inetOrgPerson.employeeType': data.inetOrgPerson.employeeType,
  //   });
  //   // console.log(identity);
  //   if (!identity && options.errorOnNotFound) {
  //     this.logger.error(`${logPrefix} Identity not found.`);
  //     throw new HttpException('Identity not found.', 404);
  //   }
  //   data.additionalFields.validations = {};
  //   try {
  //     this.logger.log(`${logPrefix} Starting additionalFields validation.`);
  //     const validations = await this._validation.validate(data.additionalFields);
  //     this.logger.log(`${logPrefix} AdditionalFields validation successful.`);
  //     this.logger.log(`Validations : ${validations}`);
  //     data.state = IdentityState.TO_VALIDATE;
  //   } catch (error) {
  //     data = this.handleValidationError(error, data, logPrefix);
  //   }

  //   //TODO: ameliorer la logique d'upsert
  //   if (identity) {
  //     this.logger.log(`${logPrefix} Identity already exists. Updating.`);
  //     data.inetOrgPerson = {
  //       ...identity.inetOrgPerson,
  //       ...data.inetOrgPerson,
  //     };
  //     data.additionalFields.objectClasses = [
  //       ...new Set([...identity.additionalFields.objectClasses, ...data.additionalFields.objectClasses]),
  //     ];
  //     data.additionalFields.attributes = {
  //       ...identity.additionalFields.attributes,
  //       ...data.additionalFields.attributes,
  //     };
  //     data.additionalFields.validations = {
  //       ...identity.additionalFields.validations,
  //       ...data.additionalFields.validations,
  //     };
  //   }

  //   //TODO: rechercher par uid ou employeeNumber + employeeType ?
  //   const upsert = await super.upsert({ 'inetOrgPerson.uid': data.inetOrgPerson.uid }, data, options);
  //   return upsert;
  //   //TODO: add backends service logic here
  // }

  public async update<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    update: UpdateQuery<T>,
    options?: QueryOptions<T> & { rawResult: true },
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    // noinspection UnnecessaryLocalVariableJS
    //TODO : add validation logic here
    const logPrefix = `Validation [${update.inetOrgPerson.cn}]:`;
    try {
      this.logger.log(`${logPrefix} Starting additionalFields validation.`);
      const validations = await this._validation.validate(update.additionalFields);
      this.logger.log(`${logPrefix} AdditionalFields validation successful.`);
      this.logger.log(`Validations : ${validations}`);
    } catch (error) {
      if (error instanceof ValidationConfigException) {
        this.logger.error(`${logPrefix} Validation config error. ${JSON.stringify(error.getValidations())}`);
        throw new ValidationConfigException(error.getPayload());
      }
      if (error instanceof ValidationSchemaException) {
        this.logger.warn(`${logPrefix} Validation schema error. ${JSON.stringify(error.getValidations())}`);
        update.additionalFields.validations = error.getValidations();
        throw new ValidationSchemaException(error.getPayload());
      } else {
        this.logger.error(`${logPrefix} Unhandled error: ${error.message}`);
        throw error; // Rethrow the original error if it's not one of the handled types.
      }
    }
    // if (update.state === IdentityState.TO_COMPLETE) {
    update = { ...update, state: IdentityState.TO_VALIDATE };
    // }
    // if (update.state === IdentityState.SYNCED) {
    //   update = { ...update, state: IdentityState.TO_VALIDATE };
    // }
    //update.state = IdentityState.TO_VALIDATE;
    const updated = await super.update(_id, update, options);
    //TODO: add backends service logic here (TO_SYNC)
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

    return updated;
  }

  public async delete<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<Query<T, T, any, T>> {
    // noinspection UnnecessaryLocalVariableJS
    //TODO: soft delete
    const deleted = await super.delete(_id, options);
    //TODO: add backends service logic here (TO_SYNC)
    return deleted;
  }

  private handleValidationError(
    error: Error | HttpException,
    identity: Identities | IdentitiesUpsertDto,
    logPrefix: string,
  ): any {
    if (error instanceof ValidationConfigException) {
      this.logger.error(`${logPrefix} Validation config error. ${JSON.stringify(error.getValidations())}`);
      throw new ValidationConfigException(error.getPayload());
    }

    if (error instanceof ValidationSchemaException) {
      this.logger.warn(`${logPrefix} Validation schema error. ${JSON.stringify(error.getValidations())}`);
      identity.additionalFields.validations = error.getValidations() as any;
      if (identity.state === IdentityState.TO_CREATE) {
        this.logger.warn(`${logPrefix} State set to TO_COMPLETE.`);
        identity.state = IdentityState.TO_COMPLETE;
        return identity;
      } else {
        this.logger.error(`${logPrefix} Validation schema error. ${JSON.stringify(error.getValidations())}`);
        throw new ValidationSchemaException(error.getPayload());
      }
    } else {
      this.logger.error(`${logPrefix} Unhandled error: ${error.message}`);
      throw error; // Rethrow the original error if it's not one of the handled types.
    }
  }
}
