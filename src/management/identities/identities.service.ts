import { BadRequestException, forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
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
import { BackendsService } from '~/core/backends/backends.service';

@Injectable()
export class IdentitiesService extends AbstractServiceSchema {
  public constructor(
    @InjectModel(Identities.name) protected _model: Model<Identities>,
    protected readonly _validation: IdentitiesValidationService,
    protected readonly storage: FactorydriveService,
    @Inject(forwardRef(() => BackendsService)) protected readonly backends: BackendsService,
  ) {
    super();
  }

  public async create<T extends AbstractSchema | Document>(
    data?: any,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    data = this.transformNullsToString(data);
    await this.checkInetOrgPersonJpegPhoto(data);
    const created: Document<T, any, T> = await super.create(data, options);
    return created;
    //TODO: add backends service logic here
  }

  public async upsertWithFingerprint<T extends AbstractSchema | Document>(
    filters: FilterQuery<T>,
    data?: IdentitiesUpsertDto,
    options?: QueryOptions<T>,
  ): Promise<[HttpStatus.OK | HttpStatus.CREATED, ModifyResult<Query<T, T, any, T>>]> {
    data = this.transformNullsToString(data);
    const identity = await this.model.findOne<Identities>(filters).exec();
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
        ...(data.additionalFields?.objectClasses || []),
        ...((identity as any)?.additionalFields?.objectClasses || []),
      ]),
    });

    if (!data?.inetOrgPerson?.employeeNumber || !data?.inetOrgPerson?.employeeType) {
      throw new BadRequestException(
        'inetOrgPerson.employeeNumber and inetOrgPerson.employeeType are required for create identity.',
      );
    }
    if (data.inetOrgPerson?.employeeNumber.indexOf('174981') >= 0 || data.inetOrgPerson?.employeeNumber.indexOf('162982') >= 0) {
      console.log('test');
    }
    //controle si l identité est fusionnée si c est la bonne à mettre à jour puisqu elle a 2 employeeNumber
    if (identity !== null && identity?.srcFusionId !== null) {
      if (identity.primaryEmployeeNumber !== data?.inetOrgPerson?.employeeNumber[0]) {
        throw new HttpException('Secondary identity', HttpStatus.SEE_OTHER);
      }
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

    console.log('insert', {
      $setOnInsert: {
        ...crushedSetOnInsert,
        // 'state': IdentityState.TO_CREATE,
      },
      $set: {
        ...crushedUpdate,
        'additionalFields.objectClasses': data.additionalFields.objectClasses,
        lastSync: new Date(),
      },
    })

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
          lastSync: new Date(),
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
    update = this.transformNullsToString(update);
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

  public transformNullsToString(obj) {
    if (obj === null) {
      return '';
    }

    if (Array.isArray(obj)) {
      return obj.map(this.transformNullsToString);
    }

    if (typeof obj === 'object' && !(obj instanceof Types.ObjectId)) {
      for (const key in obj) {
        if (obj[key] === null) {
          obj[key] = '';
        } else if (typeof obj[key] === 'object') {
          // console.log('key', key);
          obj[key] = this.transformNullsToString(obj[key]);
        }
      }
    }

    return obj;
  }
  public async searchDoubles() {
    const agg1 = [
      {
        $match: {
          state: { $ne: IdentityState.DONT_SYNC },
          destFusionId: { $eq: null },
        },
      },
      {
        $addFields: {
          test: {
            $concat: [
              '$additionalFields.attributes.supannPerson.supannOIDCDatedeNaissance',
              '$inetOrgPerson.givenName',
            ],
          },
        },
      },
      {
        $group: {
          _id: '$test',
          n: {
            $sum: 1,
          },
          list: {
            $addToSet: {
              _id: '$_id',
              uid: '$inetOrgPerson.uid',
              cn: '$inetOrgPerson.cn',
              employeeNumber: '$inetOrgPerson.employeeNumber',
              departmentNumber: '$inetOrgPerson.departmentNumber',
              state: '$state',
              lastSync: '$lastSync',
            },
          },
        },
      },
      {
        $match: {
          n: {
            $gt: 1,
          },
        },
      },
    ];
    const agg2 = [
      {
        $match: {
          state: { $ne: IdentityState.DONT_SYNC },
          destFusionId: { $eq: null },
        },
      },
      {
        $group: {
          _id: '$inetOrgPerson.uid',
          n: {
            $sum: 1,
          },
          list: {
            $addToSet: {
              _id: '$_id',
              uid: '$inetOrgPerson.uid',
              cn: '$inetOrgPerson.cn',
              employeeNumber: '$inetOrgPerson.employeeNumber',
              departmentNumber: '$inetOrgPerson.departmentNumber',
              state: '$state',
              lastSync: '$lastSync',
            },
          },
        },
      },
      {
        $match: {
          n: {
            $gt: 1,
          },
        },
      },
    ];
    const result1 = await this._model.aggregate(agg1);
    const result2 = await this._model.aggregate(agg2);
    const result3 = result1.map((x) => {
      const k = x.list[0]._id + '/' + x.list[1]._id;
      const k1 = x.list[1]._id + '/' + x.list[0]._id;
      return { k1: k1, k: k, key1: x.list[0]._id, key2: x.list[1]._id, data: x.list };
    });
    const result4 = result2.map((x) => {
      const k = x.list[0]._id + '/' + x.list[1]._id;
      const k1 = x.list[1]._id + '/' + x.list[0]._id;
      return { k1: k1, k: k, key1: x.list[0]._id, key2: x.list[1]._id, data: x.list };
    });
    result4.forEach((x) => {
      const r = result3.find((o) => o.k === x.k);
      const r1 = result3.find((o) => o.k1 === x.k);
      if (r === undefined && r1 === undefined) {
        result3.push(x);
      }
    });
    return result3;
  }
  //fusionne les deux identités id2 > id1 les champs presents dans id2 et non present dans id1 seront ajoutés
  // retourne l'id de na nouvelle identité créée
  public async fusion(id1, id2) {
    let identity1: Identities = null;
    let identity2: Identities & any = null;
    try {
      identity1 = await this.findById<Identities>(id1);
    } catch (error) {
      throw new BadRequestException('Id1 not found');
    }
    try {
      identity2 = await this.findById<Identities>(id2);
    } catch (error) {
      throw new BadRequestException('Id2  not found');
    }
    //test si une ou les  deux entités ont deja été fusionnées
    if (identity1.destFusionId !== undefined && identity1.destFusionId !== null) {
      throw new BadRequestException('Id1 est déjà fusionnée');
    }
    if (identity2.destFusionId !== undefined && identity2.destFusionId !== null) {
      throw new BadRequestException('Id2 est déjà fusionnée');
    }
    //pour savoir qu elle est l'identité maitre seule celle-ci sera mise à jour par taiga
    identity1.primaryEmployeeNumber = identity1.inetOrgPerson.employeeNumber[0];

    identity1.inetOrgPerson.employeeNumber = [
      ...identity1.inetOrgPerson.employeeNumber,
      ...identity2.inetOrgPerson.employeeNumber,
    ];
    // si supann est present
    if (
      identity1.additionalFields.objectClasses.includes('supannPerson') &&
      identity2.additionalFields.objectClasses.includes('supannPerson')
    ) {
      identity2.additionalFields.attributes.supannPerson.supannTypeEntiteAffectation.forEach((depN) => {
        (identity1.additionalFields.attributes.supannPerson as any).supannTypeEntiteAffectation.push(depN);
      });
      // supannRefId
      identity2.additionalFields.attributes.supannPerson.supannRefId.forEach((depN) => {
        (identity1.additionalFields.attributes.supannPerson as any).supannRefId.push(depN);
      });
    }
    identity1.state = IdentityState.TO_VALIDATE;
    identity1.srcFusionId = identity2._id;
    identity2.destFusionId = identity1._id;
    identity2.inetOrgPerson.employeeNumber[0] = 'F' + identity2.inetOrgPerson.employeeNumber[0];
    //delete identity2 si elle a deja été synchro ?
    if (identity2.lastBackendSync !== null) {
      await this.backends.deleteIdentities([identity2._id.toString()]);
    }
    identity2.state = IdentityState.DONT_SYNC;
    // modification identité2
    await super.update(identity2._id, identity2);
    // modification identité1
    await super.update(identity1._id, identity1);
    return identity1._id;
  }
}
