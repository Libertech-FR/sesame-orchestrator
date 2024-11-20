import { AbstractIdentitiesService } from '~/management/identities/abstract-identities.service';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { Document, FilterQuery, ModifyResult, Query, QueryOptions } from 'mongoose';
import { IdentitiesUpsertDto } from '~/management/identities/_dto/identities.dto';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { Identities } from '~/management/identities/_schemas/identities.schema';
import { toPlainAndCrush } from '~/_common/functions/to-plain-and-crush';
import { construct, omit, unique } from 'radash';
import { IdentityState } from '~/management/identities/_enums/states.enum';

export class IdentitiesUpsertService extends AbstractIdentitiesService {
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
    //controle si l identité est fusionnée si c est la bonne à mettre à jour puisqu elle a 2 employeeNumber
    if (identity !== null && identity?.srcFusionId) {
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

    this.logger.verbose('identities upsert data: ' + JSON.stringify({
      $setOnInsert: {
        ...crushedSetOnInsert,
        // 'state': IdentityState.TO_CREATE,
      },
      $set: {
        ...crushedUpdate,
        'additionalFields.objectClasses': data.additionalFields.objectClasses,
        lastSync: new Date(),
      },
    }, null, 2));

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
}
