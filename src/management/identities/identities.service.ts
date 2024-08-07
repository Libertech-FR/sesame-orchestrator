import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
import { createHash } from 'node:crypto';
import { construct, omit, unique } from 'radash';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { ValidationConfigException, ValidationSchemaException } from '~/_common/errors/ValidationException';
import { toPlainAndCrush } from '~/_common/functions/to-plain-and-crush';
import { IdentitiesUpsertDto } from './_dto/identities.dto';
import { IdentityState } from './_enums/states.enum';
import { Identities } from './_schemas/identities.schema';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { FactorydriveService } from '@the-software-compagny/nestjs_module_factorydrive';

@Injectable()
export class IdentitiesService extends AbstractServiceSchema {
  constructor(
    @InjectModel(Identities.name) protected _model: Model<Identities>,
    protected readonly _validation: IdentitiesValidationService,
    protected readonly storage: FactorydriveService,
  ) {
    super();
  }

  public async create<T extends AbstractSchema | Document>(
    data?: any,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    await this.checkInetOrgPersonJpegPhoto(data);
    const created: Document<T, any, T> = await super.create(data, options);
    return created;
    //TODO: add backends service logic here
  }

  public async upsertWithFingerprint<T extends AbstractSchema | Document>(
    filters: FilterQuery<T>,
    data?: IdentitiesUpsertDto,
    options?: QueryOptions<T>,
  ): Promise<[(HttpStatus.OK | HttpStatus.CREATED), ModifyResult<Query<T, T, any, T>>]> {
    const identity = await this.model.findOne(filters).exec();
    this.logger.log(`Upserting identity with filters ${JSON.stringify(filters)}`);

    const crushedUpdate = toPlainAndCrush(omit(data || {}, ['$setOnInsert']));
    const crushedSetOnInsert = toPlainAndCrush(data.$setOnInsert || {});
    data = construct({
      ...crushedSetOnInsert,
      ...toPlainAndCrush(identity?.toJSON() || {}, {
        excludePrefixes: ['_id', 'fingerprint'],
      }),
      ...crushedUpdate,
      'additionalFields.objectClasses': unique([
        ...data.additionalFields?.objectClasses || [],
        ...(identity as any)?.additionalFields?.objectClasses || [],
      ]),
    });

    if (!data?.inetOrgPerson?.employeeNumber || !data?.inetOrgPerson?.employeeType) {
      throw new BadRequestException('inetOrgPerson.employeeNumber and inetOrgPerson.employeeType are required for create identity.');
    }

    await this.checkInetOrgPersonJpegPhoto(data);

    const logPrefix = `Validation [${data?.inetOrgPerson?.employeeType}:${data?.inetOrgPerson?.employeeNumber}]:`;
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

    const fingerprint = await this.previewFingerprint(
      construct({
        ...toPlainAndCrush(identity?.toJSON()),
        ...crushedUpdate,
      }),
    );
    await this.checkFingerprint(filters, fingerprint);

    const upserted = await super.upsert(
      filters,
      {
        $setOnInsert: {
          ...crushedSetOnInsert,
          // 'state': IdentityState.TO_CREATE,
        },
        $set: {
          ...crushedUpdate,
          'additionalFields.objectClasses': data.additionalFields.objectClasses,
          'lastSync': new Date(),
        },
      },
      options,
    );

    return [
      identity ? HttpStatus.OK : HttpStatus.CREATED,
      await this.generateFingerprint(upserted as unknown as Identities, fingerprint),
    ];
  }

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

  public async checkFingerprint<T extends AbstractSchema | Document>(
    filters: FilterQuery<T>,
    fingerprint: string,
  ): Promise<void> {
    const identity = await this.model
      .findOne(
        { ...filters, fingerprint },
        {
          _id: 1,
        },
      )
      .exec();
    if (identity) {
      this.logger.debug(`Fingerprint matched for <${identity._id}> (${fingerprint}).`);
      this._model.findByIdAndUpdate(identity._id, { lastSync: new Date() }).exec();
      throw new HttpException('Fingerprint matched.', HttpStatus.NOT_MODIFIED);
    }
  }

  private async generateFingerprint<T extends AbstractSchema | Document>(
    identity: Identities,
    fingerprint?: string,
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    if (!fingerprint) {
      fingerprint = await this.previewFingerprint(identity.toJSON());
    }

    const updated = await this.model.findOneAndUpdate(
      { _id: identity._id, fingerprint: { $ne: fingerprint } },
      { fingerprint },
      {
        new: true,
      },
    );

    if (!updated) {
      this.logger.verbose(`Fingerprint already up to date for <${identity._id}>.`);
      return identity as unknown as ModifyResult<Query<T, T, any, T>>;
    }

    this.logger.debug(`Fingerprint updated for <${identity._id}>: ${fingerprint}`);
    return updated as unknown as ModifyResult<Query<T, T, any, T>>;
  }

  private async previewFingerprint(identity: any): Promise<string> {
    const additionalFields = omit(identity.additionalFields, ['validations']);
    const data = JSON.stringify(
      construct(
        omit(
          toPlainAndCrush({
            inetOrgPerson: identity.inetOrgPerson,
            additionalFields,
          }) as any,
          [
            //TODO: add configurable fields to exclude
            /* 'additionalFields.attributes.supannPerson.supannOIDCGenre' */
          ],
        ),
      ),
    );

    const hash = createHash('sha256');
    hash.update(data);
    return hash.digest('hex').toString();
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
      // console.log('identity.state', identity.state)
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

  private async checkInetOrgPersonJpegPhoto(data: any) {
    if (data?.inetOrgPerson?.jpegPhoto) {
      let reqStorage;
      const [disk, path] = data.inetOrgPerson.jpegPhoto.split(':');

      try {
        reqStorage = await this.storage.getDisk(disk).exists(path);
      } catch (error) {
        throw new BadRequestException(`Error while checking photo in storage: ${error.message}`);
      }

      if (!reqStorage.exists) {
        throw new BadRequestException(`Photo not found in storage: ${data.inetOrgPerson.jpegPhoto}`);
      }
    }
  }
}
