import { additionalFieldsPartDto } from './_dto/_parts/additionalFields.dto';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Identities } from './_schemas/identities.schema';
import { Document, Model, ModifyResult, Query, QueryOptions, SaveOptions, Types, UpdateQuery } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { ValidationConfigException, ValidationSchemaException } from '~/_common/errors/ValidationException';
import { IdentityState } from './_enums/states.enum';

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
    data?: any,
    options?: QueryOptions<T>,
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    const logPrefix = `Validation [${data.inetOrgPerson.cn}]:`;
    try {
      Logger.log(`${logPrefix} Starting additionalFields validation.`);
      await this._validation.validate(data.additionalFields);
      Logger.log(`${logPrefix} AdditionalFields validation successful.`);
      data.state = IdentityState.TO_VALIDATE;
    } catch (error) {
      data = this.handleValidationError(error, data, logPrefix);
    }
    const upsert = await super.upsert({ 'inetOrgPerson.uid': data.inetOrgPerson.uid }, data, options);
    return upsert;
    //TODO: add backends service logic here
  }

  public async update<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    update: UpdateQuery<T>,
    options?: QueryOptions<T> & { rawResult: true },
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    // noinspection UnnecessaryLocalVariableJS
    const updated = await super.update(_id, update, options);
    //TODO: add backends service logic here (TO_SYNC)
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

  private handleValidationError(error: Error | HttpException, identity: Identities, logPrefix: string) {
    if (error instanceof ValidationConfigException) {
      Logger.error(`${logPrefix} Validation config error. ${JSON.stringify(error.getValidations())}`);
      throw new ValidationConfigException(error.getPayload());
    }

    if (error instanceof ValidationSchemaException) {
      Logger.warn(`${logPrefix} Validation schema error. ${JSON.stringify(error.getValidations())}`);
      if (identity.state === IdentityState.TO_CREATE) {
        Logger.warn(`${logPrefix} State set to TO_COMPLETE.`);
        identity.state = IdentityState.TO_COMPLETE;
        identity.additionalFields.validations = error.getValidations();
        return identity;
      } else {
        Logger.error(`${logPrefix} Validation schema error. ${JSON.stringify(error.getValidations())}`);
        throw new ValidationSchemaException(error.getPayload());
      }
    } else {
      Logger.error(`${logPrefix} Unhandled error: ${error.message}`);
      throw error; // Rethrow the original error if it's not one of the handled types.
    }
  }
}
