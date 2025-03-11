import {BadRequestException, forwardRef, HttpException, Inject, Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Document, Model, ModifyResult, Query, Types} from 'mongoose';
import {AbstractServiceSchema} from '~/_common/abstracts/abstract.service.schema';
import {AbstractSchema} from '~/_common/abstracts/schemas/abstract.schema';
import {ValidationConfigException, ValidationSchemaException} from '~/_common/errors/ValidationException';
import {IdentitiesUpsertDto} from './_dto/identities.dto';
import {IdentityState} from './_enums/states.enum';
import {Identities} from './_schemas/identities.schema';
import {IdentitiesValidationService} from './validations/identities.validation.service';
import {FactorydriveService} from '@the-software-compagny/nestjs_module_factorydrive';
import {BackendsService} from '~/core/backends/backends.service';
import {construct, omit} from 'radash';
import {toPlainAndCrush} from '~/_common/functions/to-plain-and-crush';
import {createHash} from 'node:crypto';
import {PasswdadmService} from "~/settings/passwdadm.service";
import {DataStatusEnum} from "~/management/identities/_enums/data-status";
import {JobState} from "~/core/jobs/_enums/state.enum";

@Injectable()
export abstract class AbstractIdentitiesService extends AbstractServiceSchema {
  public constructor(
    @InjectModel(Identities.name) protected _model: Model<Identities>,
    protected readonly _validation: IdentitiesValidationService,
    protected readonly storage: FactorydriveService,
    protected readonly passwdAdmService: PasswdadmService,
    @Inject(forwardRef(() => BackendsService)) protected readonly backends: BackendsService,
  ) {
    super();
  }

  protected handleValidationError(
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

  protected async checkInetOrgPersonJpegPhoto(data: any) {
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
  protected async generateFingerprint<T extends AbstractSchema | Document>(
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

  protected async previewFingerprint(identity: any): Promise<string> {
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
  public async activation(id: string, status: DataStatusEnum) {
    //recherche de l'identité
    let identity: Identities = null;
    let statusChanged = false;
    try {
      identity = await this.findById<Identities>(id);
    } catch (error) {
      throw new HttpException('Id not found', 400);
    }
    if (identity.lastBackendSync === null) {
      throw new HttpException('Identity has never been synced', 400);
    }
    if (identity.dataStatus !== DataStatusEnum.DELETED) {
      identity.dataStatus = status;
      statusChanged = true;
    } else {
      throw new BadRequestException('Identity is in status deleted');
    }
    //sauvegarde de l'identité
    if (statusChanged) {
      // le dataStaus à changé on envoye l info aux backend et on enregistre l identité
      // Envoi du status au backend
      let statusBackend=true
      if (status == DataStatusEnum.INACTIVE || status == DataStatusEnum.PASSWORDNEEDTOBECHANGED){
           statusBackend= false
      }
      const result = await this.backends.activationIdentity(identity._id.toString(),statusBackend);
      if (result.state === JobState.COMPLETED) {
        await super.update(identity._id, identity);
      } else {
        throw new HttpException('Backend failed', 400);
      }
    }
  }
  public async askToChangePassword(id: string){
    try {
      const identity = await this.findById<Identities>(id);
      if (identity.dataStatus === DataStatusEnum.ACTIVE) {
        identity.dataStatus = DataStatusEnum.PASSWORDNEEDTOBECHANGED
        await super.update(identity._id, identity);
      } else {
        throw new BadRequestException('Identity not in active');
      }
    } catch (error) {
      throw new HttpException('Id not found', 400);
    }
  }
  /**
   * Check if mail and uid are unique. If mail is empty  it is not checked
   * @param data
   * @private
   */
  protected async checkMailAndUid(data): Promise <boolean> {
    let dataDup=[];
    if (data.inetOrgPerson.hasOwnProperty('mail')  && data.inetOrgPerson.mail !== ''){
      const id=new Types.ObjectId(data['_id']);
      const f: any = { '_id': {$ne : id},$or: [{ 'inetOrgPerson.uid': data.inetOrgPerson.uid }, { 'inetOrgPerson.mail': data.inetOrgPerson.mail }] };
      dataDup = await this._model.find(f).exec()
    }else{
      const id=new Types.ObjectId(data['_id']);
      const f: any = { '_id': {$ne : id},'inetOrgPerson.uid': data.inetOrgPerson.uid };
      dataDup = await this._model.find(f).exec()
    }
    if (dataDup.length > 0) {
      return false
    }else{
      return true
    }
  }
  protected async checkMail(data): Promise <boolean> {
    let dataDup=0;
    if (data.inetOrgPerson.hasOwnProperty('mail')  && data.inetOrgPerson.mail !== ''){
      const id=new Types.ObjectId(data['_id']);
      const f: any =  { '_id': {$ne : id},'inetOrgPerson.mail': data.inetOrgPerson.mail };
      dataDup = await this._model.countDocuments(f).exec()
    }
    if (dataDup> 0) {
      return false
    }else{
      return true
    }
  }
  protected async checkUid(data): Promise <boolean> {
    let dataDup=0;
    const id=new Types.ObjectId(data['_id']);
    const f: any = {'_id': {$ne : id}, 'inetOrgPerson.uid': data.inetOrgPerson.uid };
    dataDup = await this._model.countDocuments(f).exec()
    if (dataDup > 0) {
      return false
    }else{
      return true
    }
  }
}
