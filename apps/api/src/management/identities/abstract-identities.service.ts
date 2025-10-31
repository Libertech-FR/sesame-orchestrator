import { BadRequestException, forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Document, Model, ModifyResult, Query, Types } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { ValidationConfigException, ValidationSchemaException } from '~/_common/errors/ValidationException';
import { IdentitiesUpsertDto } from './_dto/identities.dto';
import { IdentityState } from './_enums/states.enum';
import { Identities } from './_schemas/identities.schema';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { FactorydriveService } from '~/_common/factorydrive';
import { BackendsService } from '~/core/backends/backends.service';
import { construct, omit } from 'radash';
import { toPlainAndCrush } from '~/_common/functions/to-plain-and-crush';
import { createHash } from 'node:crypto';
import { PasswdadmService } from "~/settings/passwdadm.service";
import { DataStatusEnum } from "~/management/identities/_enums/data-status";
import { JobState } from "~/core/jobs/_enums/state.enum";
import { inetOrgPersonDto } from './_dto/_parts/inetOrgPerson.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Service abstrait pour la gestion des identités
 * Fournit les fonctionnalités de base pour la validation, vérification d'unicité,
 * génération d'empreintes et gestion des états des identités
 */
@Injectable()
export abstract class AbstractIdentitiesService extends AbstractServiceSchema {
  /**
   * Constructeur du service abstrait des identités
   *
   * @param _model - Modèle Mongoose pour les identités
   * @param _validation - Service de validation des identités
   * @param storage - Service de stockage de fichiers
   * @param passwdAdmService - Service d'administration des mots de passe
   * @param eventEmitter - Émetteur d'événements
   * @param backends - Service de gestion des backends
   */
  public constructor(
    @InjectModel(Identities.name) protected _model: Model<Identities>,
    protected readonly _validation: IdentitiesValidationService,
    protected readonly storage: FactorydriveService,
    protected readonly passwdAdmService: PasswdadmService,
    protected readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => BackendsService)) protected readonly backends: BackendsService,
  ) {
    super({
      eventEmitter,
      serviceName: 'identities',
    });
  }

  /**
   * Gère les erreurs de validation et détermine l'action appropriée
   *
   * @param error - L'erreur à traiter (ValidationConfigException, ValidationSchemaException ou autre)
   * @param identity - L'identité concernée par l'erreur
   * @param logPrefix - Préfixe pour les logs
   * @returns L'identité modifiée en cas de ValidationSchemaException
   * @throws ValidationConfigException pour les erreurs de configuration
   * @throws Error pour les erreurs non gérées
   */
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
      this.logger.warn(`${logPrefix} Validation handleValidationError schema error. ${JSON.stringify(error.getValidations())}`);
      identity.additionalFields.validations = error.getValidations();

      this.logger.warn(`${logPrefix} State set to TO_COMPLETE.`);
      identity.state = IdentityState.TO_COMPLETE;

      return identity;
    } else {
      this.logger.error(`${logPrefix} Unhandled error: ${error.message}`);
      throw error; // Rethrow the original error if it's not one of the handled types.
    }
  }

  /**
   * Transforme récursivement toutes les valeurs null d'un objet en chaînes vides
   * Utile pour normaliser les données avant traitement
   *
   * @param obj - L'objet à transformer (peut être de n'importe quel type)
   * @returns L'objet transformé avec les valeurs null remplacées par des chaînes vides
   */
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
          obj[key] = this.transformNullsToString(obj[key]);
        }
      }
    }

    return obj;
  }

  /**
   * Vérifie l'existence d'une photo JPEG dans le stockage
   *
   * @param data - Les données contenant potentiellement une référence à une photo
   * @throws BadRequestException si la photo est référencée mais introuvable dans le stockage
   */
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

  /**
   * Génère et met à jour l'empreinte digitale d'une identité
   * L'empreinte est mise à jour seulement si elle diffère de l'actuelle
   *
   * @param identity - L'identité pour laquelle générer l'empreinte
   * @param fingerprint - Empreinte pré-calculée (optionnelle)
   * @returns L'identité mise à jour avec la nouvelle empreinte
   */
  public async generateFingerprint<T extends AbstractSchema | Document>(
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

  /**
   * Sérialise un objet de manière stable et déterministe
   * Les clés sont triées pour garantir une sérialisation cohérente
   *
   * @param obj - L'objet à sérialiser
   * @returns La représentation string stable de l'objet
   */
  private stableStringify(obj) {
    if (typeof obj !== "object" || obj === null) {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return `[${obj.map(this.stableStringify).join(',')}]`;
    }

    return `{${Object.keys(obj).sort().map(key =>
      JSON.stringify(key) + ':' + this.stableStringify(obj[key])
    ).join(',')}}`;
  }

  /**
   * Calcule l'empreinte digitale d'une identité sans la sauvegarder
   * Utilise les données inetOrgPerson et additionalFields (sans validations)
   *
   * @param identity - Les données de l'identité pour calculer l'empreinte
   * @returns L'empreinte digitale SHA-256 en hexadécimal
   */
  public async previewFingerprint(identity: any): Promise<string> {
    const inetOrgPerson = inetOrgPersonDto.initForFingerprint(identity.inetOrgPerson);

    const additionalFields = omit(identity.additionalFields, ['validations']);
    const data = construct(
      omit(
        toPlainAndCrush({
          inetOrgPerson,
          additionalFields,
        }) as any,
        [
          //TODO: add configurable fields to exclude
          /* 'additionalFields.attributes.supannPerson.supannOIDCGenre' */
        ],
      ),
    );

    const hash = createHash('sha256');
    hash.update(this.stableStringify(data));
    return hash.digest('hex').toString();
  }

  /**
   * Active ou désactive une identité en modifiant son statut de données
   * Synchronise le changement avec les backends et met à jour l'identité
   *
   * @param id - L'identifiant de l'identité à modifier
   * @param status - Le nouveau statut à appliquer
   * @throws HttpException si l'identité n'est pas trouvée ou n'a jamais été synchronisée
   * @throws BadRequestException si l'identité est supprimée ou si le backend échoue
   */
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
    // sauvegarde de l'identité
    if (statusChanged) {
      // le dataStatus à changé on envoye l info aux backend et on enregistre l identité
      // Envoi du status au backend
      let statusBackend = true
      if (status == DataStatusEnum.INACTIVE || status == DataStatusEnum.PASSWORDNEEDTOBECHANGED) {
        statusBackend = false
      }
      const result = await this.backends.activationIdentity(identity._id.toString(), statusBackend);
      if (result.state === JobState.COMPLETED) {
        await super.update(identity._id, identity);
      } else {
        throw new HttpException('Backend failed', 400);
      }
    }
  }

  /**
   * Demande le changement de mot de passe pour une identité
   * L'identité doit être dans un statut ACTIVE pour que la demande soit acceptée
   *
   * @param id - L'identifiant de l'identité
   * @throws BadRequestException si l'identité n'est pas active
   * @throws HttpException si l'identité n'est pas trouvée
   */
  public async askToChangePassword(id: string): Promise<void> {
    // Validation du paramètre d'entrée
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Valid ID is required for password change request');
    }

    try {
      // Recherche de l'identité
      const identity = await this.findById<Identities>(id);

      if (!identity) {
        throw new HttpException('Identity not found', 404);
      }

      // Vérification que l'identité est dans un statut actif
      if (identity.dataStatus !== DataStatusEnum.ACTIVE) {
        throw new BadRequestException(`Identity is not active. Current status: ${identity.dataStatus}`);
      }

      // Mise à jour du statut pour demander le changement de mot de passe
      identity.dataStatus = DataStatusEnum.PASSWORDNEEDTOBECHANGED;

      // Sauvegarde de l'identité
      await super.update(identity._id, identity);

      this.logger.log(`Password change requested for identity ${id}`);

    } catch (error) {
      // Gestion spécifique des erreurs déjà connues
      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error;
      }

      // Gestion des erreurs inattendues
      this.logger.error(`Error requesting password change for identity ${id}: ${error.message}`);

      // Si l'identité n'est pas trouvée, on retourne une erreur 404
      if (error.message?.includes('not found') || error.name === 'CastError') {
        throw new HttpException('Identity not found', 404);
      }

      // Pour toute autre erreur, on retourne une erreur 500
      throw new HttpException('Failed to request password change', 500);
    }
  }

  /**
   * Vérifie l'unicité de l'email et de l'UID d'une identité
   * Si l'email est vide, seul l'UID est vérifié
   *
   * @param data - Les données contenant l'ID, l'UID et optionnellement l'email à vérifier
   * @returns true si l'email et l'UID sont uniques, false sinon
   */
  protected async checkMailAndUid(data: IdentitiesUpsertDto | any): Promise<boolean> {
    // Validation des paramètres d'entrée
    if (!data?._id) {
      throw new BadRequestException('ID is required for mail and UID uniqueness check');
    }

    if (!data?.inetOrgPerson?.uid) {
      throw new BadRequestException('UID is required for mail and UID uniqueness check');
    }

    // Validation du format de l'ID
    let objectId: Types.ObjectId;
    try {
      objectId = Types.ObjectId.createFromHexString(data._id);
    } catch (error) {
      throw new BadRequestException('Invalid ID format');
    }

    try {
      let duplicates: Identities[] = [];

      // Vérification avec email si celui-ci est fourni et non vide
      if (data.inetOrgPerson.hasOwnProperty('mail') && data.inetOrgPerson.mail !== '') {
        // Validation du format email
        if (typeof data.inetOrgPerson.mail !== 'string') {
          throw new BadRequestException('Invalid email format');
        }

        // Filtre pour vérifier UID ou email
        const filterWithMail = {
          '_id': { $ne: objectId },
          'deletedFlag': { $ne: true },
          $or: [
            { 'inetOrgPerson.uid': data.inetOrgPerson.uid },
            { 'inetOrgPerson.mail': data.inetOrgPerson.mail }
          ]
        };
        duplicates = await this._model.find(filterWithMail).exec();
      } else {
        // Filtre pour vérifier seulement l'UID
        const filterUidOnly = {
          '_id': { $ne: objectId },
          'deletedFlag': { $ne: true },
          'inetOrgPerson.uid': data.inetOrgPerson.uid
        };
        duplicates = await this._model.find(filterUidOnly).exec();
      }

      // Retourne true si aucun doublon n'est trouvé
      return duplicates.length === 0;

    } catch (error) {
      this.logger.error(`Error checking mail and UID uniqueness for ID "${data._id}": ${error.message}`);
      throw new HttpException('Failed to check mail and UID uniqueness', 500);
    }
  }

  /**
   * Vérifie l'unicité de l'email d'une identité
   *
   * @param identity - L'identité existante (optionnelle pour les nouvelles identités)
   * @param data - Les données contenant l'email à vérifier
   * @returns true si l'email est unique, false sinon
   */
  protected async checkMail(
    identity: Identities | null,
    data: IdentitiesUpsertDto | any,
  ): Promise<boolean> {
    // Validation des paramètres d'entrée
    if (!data?.inetOrgPerson) {
      throw new BadRequestException('inetOrgPerson data is required for mail check');
    }

    // Si l'email n'est pas fourni ou est vide, on considère qu'il est valide (pas de vérification d'unicité)
    const emailToCheck = data.inetOrgPerson.mail;
    if (!data.inetOrgPerson.hasOwnProperty('mail') || emailToCheck === '') {
      return true;
    }

    // Validation du format email basique
    if (typeof emailToCheck !== 'string') {
      throw new BadRequestException('Invalid email format');
    }

    try {
      let duplicateCount = 0;

      if (identity) {
        // Vérification pour une identité existante (mise à jour)
        const updateFilter = {
          '_id': { $ne: identity._id },
          'state': { $ne: IdentityState.DONT_SYNC },
          'deletedFlag': { $ne: true },
          'inetOrgPerson.mail': identity.inetOrgPerson.mail,
        };
        duplicateCount = await this._model.countDocuments(updateFilter).exec();
      } else {
        // Vérification pour une nouvelle identité (création)
        const createFilter = {
          'inetOrgPerson.mail': data.inetOrgPerson.mail,
        };
        duplicateCount = await this._model.countDocuments(createFilter).exec();
      }

      // Retourne true si l'email est unique (aucun doublon trouvé)
      return duplicateCount === 0;

    } catch (error) {
      this.logger.error(`Error checking email uniqueness for email "${emailToCheck}": ${error.message}`);
      throw new HttpException('Failed to check email uniqueness', 500);
    }
  }

  /**
   * Vérifie l'unicité de l'UID d'une identité
   *
   * @param identity - L'identité existante (optionnelle pour les nouvelles identités)
   * @param data - Les données contenant l'UID à vérifier
   * @returns true si l'UID est unique, false sinon
   */
  protected async checkUid(
    identity: Identities | null,
    data: IdentitiesUpsertDto | any,
  ): Promise<boolean> {
    // Validation des paramètres d'entrée
    if (!data?.inetOrgPerson?.uid) {
      throw new BadRequestException('UID is required for uniqueness check');
    }

    const uidToCheck = identity?.inetOrgPerson?.uid || data.inetOrgPerson.uid;

    if (!uidToCheck || typeof uidToCheck !== 'string') {
      throw new BadRequestException('Invalid UID format');
    }

    try {
      let duplicateCount = 0;

      if (identity) {
        // Vérification pour une identité existante (mise à jour)
        const updateFilter = {
          '_id': { $ne: identity._id },
          'state': { $ne: IdentityState.DONT_SYNC },
          'deletedFlag': { $ne: true },
          'inetOrgPerson.uid': identity?.inetOrgPerson?.uid,
        };
        duplicateCount = await this._model.countDocuments(updateFilter).exec();
      } else {
        // Vérification pour une nouvelle identité (création)
        const createFilter = {
          'inetOrgPerson.uid': data.inetOrgPerson.uid,
        };
        duplicateCount = await this._model.countDocuments(createFilter).exec();
      }

      // Retourne true si l'UID est unique (aucun doublon trouvé)
      return duplicateCount === 0;

    } catch (error) {
      this.logger.error(`Error checking UID uniqueness for UID "${uidToCheck}": ${error.message}`);
      throw new HttpException('Failed to check UID uniqueness', 500);
    }
  }
}
