import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { randomInt } from 'crypto';
import Redis from 'ioredis';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import { ActionType } from '~/core/backends/_enum/action-type.enum';
import { BackendsService } from '~/core/backends/backends.service';
import { Jobs } from '~/core/jobs/_schemas/jobs.schema';
import { AskTokenDto } from './_dto/ask-token.dto';
import { ChangePasswordDto } from './_dto/change-password.dto';
import { ResetPasswordDto } from './_dto/reset-password.dto';
import { IdentitiesCrudService } from '../identities/identities-crud.service';
import { get } from 'radash';
import { Identities } from '../identities/_schemas/identities.schema';
import { MailerService } from '@nestjs-modules/mailer';
import { InitAccountDto } from '~/management/passwd/_dto/init-account.dto';
import { ConfigService } from '@nestjs/config';
import { ResetByCodeDto } from '~/management/passwd/_dto/reset-by-code.dto';
import { PasswdadmService } from '~/settings/passwdadm.service';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { InitResetDto } from '~/management/passwd/_dto/init-reset.dto';
import { SmsadmService } from '~/settings/smsadm.service';
import { InitManyDto } from '~/management/passwd/_dto/init-many.dto';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';
import { MailadmService } from '~/settings/mailadm.service';
import { DataStatusEnum } from '~/management/identities/_enums/data-status';
import { SentMessageInfo } from 'nodemailer';
import { PasswordHistoryService } from '~/management/password-history/password-history.service';
import { PasswordPoliciesDto } from '~/settings/_dto/password-policy.dto';
import { FilterOptions } from '~/_common/restools';
import { buildExpiredInitInvitationFilter } from '~/management/passwd/init-invitation-expiration.helper';

interface TokenData {
  k: string;
  iv: string;
  tag: string;
}

interface CipherData {
  uid: string;
  mail: string;
}

@Injectable()
export class PasswdService extends AbstractService {
  public static readonly RANDOM_BYTES_K = 16;
  public static readonly RANDOM_BYTES_IV = 12;

  public static readonly TOKEN_ALGORITHM = 'aes-256-gcm';

  protected readonly BRUTEFORCE_FAIL_PREFIX = 'passwd:bf:fail';
  protected readonly BRUTEFORCE_BLOCK_PREFIX = 'passwd:bf:block';
  protected readonly BRUTEFORCE_THRESHOLD = 5;
  protected readonly BRUTEFORCE_FAIL_WINDOW_SECONDS = 6 * 60 * 60;
  protected readonly BRUTEFORCE_COOLDOWN_STEPS_SECONDS = [60, 300, 1800, 3600];

  public constructor(
    protected readonly backends: BackendsService,
    protected readonly identities: IdentitiesCrudService,
    protected mailer: MailerService,
    protected config: ConfigService,
    private passwdadmService: PasswdadmService,
    private smsadmService: SmsadmService,
    private mailadmService: MailadmService,
    private readonly passwordHistory: PasswordHistoryService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super();
  }

  //Initialisation du reset de mot de passe envoie un email ou par sms  un code et fourni un token au front.
  // Le code est la clé du token
  public async initReset(initDto: InitResetDto): Promise<any> {
    //envoi du mail
    try {
      const identity = (await this.identities.findOne({ 'inetOrgPerson.uid': initDto.uid })) as Identities;
      //test si on peu reninitialiser le compte
      if (identity.dataStatus === DataStatusEnum.INACTIVE || identity.dataStatus === DataStatusEnum.DELETED) {
        throw new BadRequestException(
          'Une erreur est survenue : Tentative de réinitialisation de mot de passe impossible',
        );
      }
      //prise des parametres
      const params = await this.passwdadmService.getPolicies();
      const k = randomInt(100000, 999999);
      //asking for padding
      const padd = await this.getPaddingForCode();
      const mailAttribute = params.emailAttribute;
      const mail = <string>get(identity.toObject(), mailAttribute);
      if (mail) {
        const token = await this.askToken({ mail: mail, uid: initDto.uid }, padd + k.toString(16), params.resetCodeTTL);
        this.logger.log('Token :' + token + '  int : ' + k.toString(10));
        if (initDto.type === 0) {
          this.logger.log('Reset password asked by mail for  : ' + initDto.uid);
          const smtpParams = await this.mailadmService.getParams();
          if (mailAttribute !== '') {
            // this.mailer.addTransporter('lastStmp', smtpParams.host)
            this.mailer
              .sendMail({
                // transporterName: 'lastStmp',
                from: smtpParams.sender,
                to: mail,
                subject: 'Reinitialisation de votre mot de passe',
                template: 'resetaccount',
                context: {
                  uid: identity.inetOrgPerson.uid,
                  displayName: identity.inetOrgPerson.displayName,
                  code: k,
                },
              })
              .then(() => {
                this.logger.log('reset compte envoyé  pour uid' + initDto.uid + ' à ' + mail);
              })
              .catch(() => {
                throw new BadRequestException({
                  message: 'Erreur serveur lors de l envoi du mail',
                  error: 'Bad Request',
                  statusCode: 400,
                });
              });
            return token;
          } else {
            return false;
          }
        } else {
          //envoi par SMS si c est possible
          const policies = await this.passwdadmService.getPolicies();
          if (policies.resetBySms === true) {
            this.logger.log('Reset password asked by SMS for  : ' + initDto.uid);
            const smsAttribute = params.mobileAttribute;
            if (smsAttribute !== '') {
              const numTel = <string>get(identity.toObject(), smsAttribute);
              await this.smsadmService.send(numTel, 'Votre code de reinitialisation : ' + k.toString(10));
            }
            return token;
          } else {
            return false;
          }
        }
      } else {
        this.logger.error('Error while reset identityMailAttribute Empty');
      }
    } catch (e) {
      this.logger.error('Error while reseting password. ' + e + ` (uid=${initDto?.uid})`);
      //on retoune un token qui ne sert à rien pour ne pas divulguer que l uid n existe pas
      const k = crypto.randomBytes(PasswdService.RANDOM_BYTES_K).toString('hex');
      const falseToken = await this.askToken({ mail: 'xxxxxx@xxxxxxxxxxx', uid: 'xxxxxxxx@xxxxxxx' }, k, 0);
      return falseToken;
    }
  }

  //Initialisation du compte. Envoi d' un mail avec un token pour l'init du compte
  public async initAccount(initDto: InitAccountDto): Promise<SentMessageInfo> {
    const identity = (await this.identities.findOne({
      'inetOrgPerson.uid': initDto.uid,
      state: IdentityState.SYNCED,
    })) as Identities;
    if (!identity) {
      throw new BadRequestException('Une erreur est survenue : Identité non synchronisée ou inconnue');
    }
    //test si on peu reninitialiser le compte
    if (identity.dataStatus === DataStatusEnum.INACTIVE || identity.dataStatus === DataStatusEnum.DELETED) {
      throw new BadRequestException(
        'Une erreur est survenue : Tentative de réinitialisation de mot de passe impossible',
      );
    }
    //envoi du mail
    const params = await this.passwdadmService.getPolicies();
    const mailAttribute = params.emailAttribute;
    this.logger.log('mailer.identityMailAttribute : ' + mailAttribute);

    if (!mailAttribute) {
      this.logger.error('Error while initAccount identityMailAttribute Empty');
      throw new BadRequestException({
        message: "Une erreur est survenue : l'attribut de l'adresse mail n'est pas défini",
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    const mail = <string>get(identity.toObject(), mailAttribute);
    if (!mail) {
      this.logger.error('Error while initAccount identityMailAttribute not defined');
      throw new BadRequestException({
        message:
          "Une erreur est survenue : L'identité <" +
          (identity.inetOrgPerson?.cn || identity._id) +
          "> n'a pas d'adresse mail",
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    const smtpParams = await this.mailadmService.getParams();
    //demande du token
    const k = crypto.randomBytes(PasswdService.RANDOM_BYTES_K).toString('hex');
    const token = await this.askToken({ mail: mail, uid: initDto.uid }, k, params.initTokenTTL);
    //envoi du token

    try {
      const template = (initDto?.template || 'initaccount').trim() || 'initaccount';
      const variables = (
        initDto?.variables && typeof initDto.variables === 'object' ? initDto.variables : {}
      ) as Record<string, any>;
      const send = await this.mailer.sendMail({
        from: smtpParams.sender,
        to: mail,
        subject: 'Activation de votre compte',
        template,
        context: {
          displayName: identity.inetOrgPerson.displayName,
          uid: initDto.uid,
          url: this.config.get('frontPwd.url') + '/initaccount/' + token,
          mail: identity.inetOrgPerson.mail,
          ...variables,
        },
      });
      this.logger.log('Init compte envoyé pour uid ' + initDto.uid + ' à ' + mail);
      await this.setInitState(identity, InitStatesEnum.SENT);

      return send;
    } catch (e) {
      this.logger.error('Error while sending init account email: ' + e);
      throw new BadRequestException({
        message: 'Erreur serveur lors de l envoi du mail',
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  }

  //Changement du password
  public async change(passwdDto: ChangePasswordDto, clientIp?: string | null): Promise<[Jobs, any]> {
    const ip = this.normalizeClientIp(clientIp);
    const uid = `${passwdDto?.uid || ''}`.trim();
    const block = await this.getChangePasswordBruteforceBlock({ uid, ip });
    if (block.blocked) {
      throw new HttpException(
        {
          message: 'Too many password change attempts. Please retry later.',
          retryAfterSeconds: block.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let shouldCountFailure = false;
    try {
      const identity = (await this.identities.findOne({
        'inetOrgPerson.uid': passwdDto.uid,
        state: IdentityState.SYNCED,
      })) as Identities;
      if (identity.dataStatus === DataStatusEnum.INACTIVE || identity.dataStatus === DataStatusEnum.DELETED) {
        throw new BadRequestException(
          'Une erreur est survenue : Tentative de réinitialisation de mot de passe impossible',
        );
      }
      //verification de la police de mdp
      if ((await this.passwdadmService.checkPolicies(passwdDto.newPassword)) === false) {
        throw new BadRequestException({
          message: 'Une erreur est survenue : Le mot de passe ne respecte pas la politique des mots de passe',
          error: 'Bad Request',
          statusCode: 400,
        });
      }
      await this.passwordHistory.assertNotReused(identity._id, passwdDto.newPassword);
      //tout est ok en envoie au backend
      shouldCountFailure = true;
      const result = await this.backends.executeJob(
        ActionType.IDENTITY_PASSWORD_CHANGE,
        identity._id,
        {
          uid: passwdDto.uid,
          oldPassword: passwdDto.oldPassword,
          newPassword: passwdDto.newPassword,
          ...identity.toJSON(),
        },
        {
          async: false,
          timeoutDiscard: true,
          disableLogs: true,
          switchToProcessing: false,
          updateStatus: false,
        },
      );
      // on met actif l'identité
      await this.identities.model.updateOne({ _id: identity._id }, { dataStatus: DataStatusEnum.ACTIVE });
      await this.passwordHistory.recordPassword(identity._id, passwdDto.newPassword, 'change');
      await this.updatePasswordUsageExpiration(identity._id);
      await this.clearChangePasswordBruteforceState({ uid, ip });
      return result;
    } catch (e) {
      if (e instanceof HttpException && e.getStatus?.() === HttpStatus.TOO_MANY_REQUESTS) throw e;

      let job = undefined;
      let _debug = undefined;
      this.logger.error('Error while changing password. ' + e + ` (uid=${passwdDto?.uid})`);

      if (shouldCountFailure) {
        const failure = await this.registerChangePasswordBruteforceFailure({ uid, ip });
        if (failure.blocked) {
          throw new HttpException(
            {
              message: 'Too many password change attempts. Please retry later.',
              retryAfterSeconds: failure.retryAfterSeconds,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      if (e?.response?.status === HttpStatus.BAD_REQUEST) {
        job = {};
        job['status'] = e?.response?.job?.status;
      }

      if (process.env.NODE_ENV === 'development') {
        _debug = e?.response?.error?.response;
      }

      throw new BadRequestException({
        message: 'Une erreur est survenue : Mot de passe incorrect ou utilisateur inconnu',
        error: 'Bad Request',
        statusCode: 400,
        job,
        _debug,
      });
    }
  }

  protected normalizeClientIp(clientIp?: string | null): string | null {
    if (!clientIp || typeof clientIp !== 'string') return null;
    let value = clientIp.trim();
    if (!value) return null;
    if (value.startsWith('::ffff:')) value = value.slice(7);
    const zoneIdx = value.indexOf('%');
    if (zoneIdx > -1) value = value.slice(0, zoneIdx);
    if (value === '::1') return '127.0.0.1';
    return value;
  }

  protected hashKeyPart(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
  }

  protected getChangePasswordBruteforceFailKey(params: { uid: string; ip: string | null }): string {
    const ipPart = this.hashKeyPart(params.ip || 'n/a');
    const uidPart = this.hashKeyPart(`${params.uid || ''}`.trim().toLowerCase());
    return [this.BRUTEFORCE_FAIL_PREFIX, ipPart, uidPart].join(':');
  }

  protected getChangePasswordBruteforceBlockKey(params: { uid: string; ip: string | null }): string {
    const ipPart = this.hashKeyPart(params.ip || 'n/a');
    const uidPart = this.hashKeyPart(`${params.uid || ''}`.trim().toLowerCase());
    return [this.BRUTEFORCE_BLOCK_PREFIX, ipPart, uidPart].join(':');
  }

  public async getChangePasswordBruteforceBlock(params: {
    uid: string;
    ip: string | null;
  }): Promise<{ blocked: boolean; retryAfterSeconds: number }> {
    const blockKey = this.getChangePasswordBruteforceBlockKey(params);
    const ttl = await this.redis.ttl(blockKey);
    const retryAfterSeconds = Number.isFinite(ttl) && ttl > 0 ? ttl : 0;
    return { blocked: retryAfterSeconds > 0, retryAfterSeconds };
  }

  public async registerChangePasswordBruteforceFailure(params: {
    uid: string;
    ip: string | null;
  }): Promise<{ count: number; blocked: boolean; retryAfterSeconds: number }> {
    const failKey = this.getChangePasswordBruteforceFailKey(params);
    const count = await this.redis.incr(failKey);
    if (count === 1) {
      await this.redis.expire(failKey, this.BRUTEFORCE_FAIL_WINDOW_SECONDS);
    }

    if (count < this.BRUTEFORCE_THRESHOLD) {
      return { count, blocked: false, retryAfterSeconds: 0 };
    }

    const stepIndex = Math.min(
      this.BRUTEFORCE_COOLDOWN_STEPS_SECONDS.length - 1,
      Math.max(count - this.BRUTEFORCE_THRESHOLD, 0),
    );
    const cooldownSeconds =
      this.BRUTEFORCE_COOLDOWN_STEPS_SECONDS[stepIndex] ?? this.BRUTEFORCE_COOLDOWN_STEPS_SECONDS.at(-1) ?? 60;

    const blockKey = this.getChangePasswordBruteforceBlockKey(params);
    await this.redis.set(blockKey, `${count}`, 'EX', cooldownSeconds);
    return { count, blocked: true, retryAfterSeconds: cooldownSeconds };
  }

  public async clearChangePasswordBruteforceState(params: { uid: string; ip: string | null }): Promise<void> {
    await this.redis.del(this.getChangePasswordBruteforceFailKey(params));
    await this.redis.del(this.getChangePasswordBruteforceBlockKey(params));
  }

  // Genere un token pour les autres methodes
  public async askToken(askToken: AskTokenDto, k, ttl: number): Promise<string> {
    try {
      /*
      if (ttl >0){

        await this.identities.findOne({ 'inetOrgPerson.uid': askToken.uid });
      }
      */

      const iv = crypto.randomBytes(PasswdService.RANDOM_BYTES_IV).toString('base64');
      const cipher = crypto.createCipheriv(PasswdService.TOKEN_ALGORITHM, k, iv);

      let ciphertext = cipher.update(
        JSON.stringify(<CipherData>{ uid: askToken.uid, mail: askToken.mail }),
        'utf8',
        'base64',
      );
      ciphertext += cipher.final('base64');
      //on enregistre pas dans redis si le ttl =0
      if (ttl > 0) {
        await this.redis.set(
          ciphertext,
          JSON.stringify(<TokenData>{
            k,
            iv,
            tag: cipher.getAuthTag().toString('base64'),
          }),
        );
        await this.redis.expire(ciphertext, ttl);
      }
      return encodeURIComponent(ciphertext);
    } catch (e) {
      this.logger.error('Error while ask token. ' + e + ` (uid=${askToken?.uid})`);
      throw new BadRequestException('Impossible de générer un token, une erreur est survenue');
    }
  }

  // decrypte le token à l aide du code
  public async decryptTokenWithCode(token: string, code: number): Promise<CipherData> {
    try {
      token = decodeURIComponent(token);
      const result = await this.redis.get(token);
      const cypherData: TokenData = JSON.parse(result);
      this.logger.log('decrypt ' + cypherData);
      if (cypherData?.iv === undefined || cypherData?.k === undefined || cypherData?.tag === undefined) {
        throw new NotFoundException('Invalid token');
      }
      const padd = await this.getPaddingForCode();
      const k = padd + code.toString(16);
      this.logger.log('k=' + k);
      const decipher = crypto.createDecipheriv(PasswdService.TOKEN_ALGORITHM, k, cypherData.iv);
      decipher.setAuthTag(Buffer.from(cypherData.tag, 'base64'));
      const plaintext = decipher.update(token, 'base64', 'ascii');
      return JSON.parse(plaintext);
    } catch (error) {
      this.logger.error('Error while decrypting token. ' + error + ` (token=${token})`);
      throw new BadRequestException('Invalid token xx');
    }
  }

  // decrypte le token d'initialisation du compte
  public async decryptToken(token: string): Promise<CipherData> {
    try {
      token = decodeURIComponent(token);
      const result = await this.redis.get(token);
      const cypherData: TokenData = JSON.parse(result);

      if (cypherData?.iv === undefined || cypherData?.k === undefined || cypherData?.tag === undefined) {
        throw new NotFoundException('Invalid token');
      }

      const decipher = crypto.createDecipheriv(PasswdService.TOKEN_ALGORITHM, cypherData.k, cypherData.iv);
      decipher.setAuthTag(Buffer.from(cypherData.tag, 'base64'));
      const plaintext = decipher.update(token, 'base64', 'ascii');

      return JSON.parse(plaintext);
    } catch (error) {
      this.logger.verbose('Error while decrypting token. ' + error + ` (token=${token})`);
      throw new BadRequestException('Invalid token');
    }
  }

  // reset du password
  public async resetByCode(data: ResetByCodeDto): Promise<[Jobs, any]> {
    this.logger.log('resetByCode : ' + data.token + ' ' + data.code);
    //verification du passwordPolicies
    if ((await this.passwdadmService.checkPolicies(data.newpassword)) === false) {
      throw new BadRequestException({
        message: 'Une erreur est survenue : Le mot de passe ne respecte pas la politique de securité',
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    const tokenData = await this.decryptTokenWithCode(data.token, data.code);
    this.logger.log('dataToken :' + tokenData);
    try {
      const identity = (await this.identities.findOne({ 'inetOrgPerson.uid': tokenData.uid })) as Identities;
      await this.passwordHistory.assertNotReused(identity._id, data.newpassword);
      const [_, response] = await this.backends.executeJob(
        ActionType.IDENTITY_PASSWORD_RESET,
        identity._id,
        { uid: identity.inetOrgPerson.uid, newPassword: data.newpassword, ...identity.toJSON() },
        {
          async: false,
          timeoutDiscard: true,
          disableLogs: false,
          switchToProcessing: false,
          updateStatus: false,
        },
      );

      if (response?.status === 0) {
        this.logger.log('delete key');
        await this.redis.del(data.token);
        // mise de l indentité active
        // on met actif l'identité
        identity.dataStatus = DataStatusEnum.ACTIVE;
        await identity.save();
        await this.passwordHistory.recordPassword(identity._id, data.newpassword, 'reset');
        await this.updatePasswordUsageExpiration(identity._id);
        return [_, response];
      }
      this.logger.error('Error from backend while reseting password by code');
      throw new InternalServerErrorException('Une erreur est survenue : Impossible de réinitialiser le mot de passe');
    } catch (e) {
      this.logger.error('Error while reseting password by code. ' + e + ` (token=${data?.token})`);
      throw new BadRequestException(
        'Une erreur est survenue : Tentative de réinitialisation de mot de passe impossible',
      );
    }
  }

  // methode pour le reset par token (pour l initialisation du compte)
  public async reset(data: ResetPasswordDto): Promise<[Jobs, any]> {
    const tokenData = await this.decryptToken(data.token);

    try {
      const identity = (await this.identities.findOne({
        'inetOrgPerson.uid': tokenData.uid,
        state: IdentityState.SYNCED,
      })) as Identities;

      await this.passwordHistory.assertNotReused(identity._id, data.newPassword);
      const [_, response] = await this.backends.executeJob(
        ActionType.IDENTITY_PASSWORD_RESET,
        identity._id,
        { uid: tokenData.uid, newPassword: data.newPassword, ...identity.toJSON() },
        {
          async: false,
          timeoutDiscard: true,
          disableLogs: false,
          switchToProcessing: false,
          updateStatus: false,
        },
      );

      if (response?.status === 0) {
        await this.redis.del(data.token);
        await this.setInitState(identity, InitStatesEnum.INITIALIZED);
        await this.passwordHistory.recordPassword(identity._id, data.newPassword, 'reset');
        await this.updatePasswordUsageExpiration(identity._id);
        return [_, response];
      }

      throw new InternalServerErrorException('Une erreur est survenue : Impossible de réinitialiser le mot de passe');
    } catch (e) {
      this.logger.error('Error while reseting password. ' + e + ` (token=${data?.token})`);
      throw new BadRequestException(
        'Une erreur est survenue : Tentative de réinitialisation de mot de passe impossible',
      );
    }
  }

  //Envoi le message d init à plusieurs identités
  public async initMany(ids: InitManyDto): Promise<any> {
    const identities = await this.identities.find({ _id: { $in: ids.ids }, state: IdentityState.SYNCED });
    if (identities.length === 0) {
      throw new HttpException('Aucune identité synchronisée trouvée.', 404);
    }

    const updated = await Promise.all(
      identities.map(async (identity) => {
        this.logger.verbose('send To :' + identity.get('inetOrgPerson.uid'));
        try {
          return await this.initAccount({
            uid: identity.get('inetOrgPerson.uid'),
            template: ids?.template,
            variables: ids?.variables,
          });
        } catch (e) {
          this.logger.error('Error while init account for ' + identity.get('inetOrgPerson.uid') + ': ' + e);
          return null;
        }
      }),
    );

    return updated as any;
  }

  public async initOutdated(body: Pick<InitManyDto, 'template' | 'variables'> = {}): Promise<{
    total: number;
    sent: number;
    skipped: number;
  }> {
    const filter = await this.getInitOutdatedFilter();
    const total = await this.identities.model.countDocuments({
      ...filter,
      deletedFlag: { $ne: true },
      state: IdentityState.SYNCED,
    });
    let sent = 0;
    let skipped = 0;

    const cursor = this.identities.model
      .find(
        {
          ...filter,
          deletedFlag: { $ne: true },
          state: IdentityState.SYNCED,
        },
        { 'inetOrgPerson.uid': 1 },
      )
      .cursor();

    for await (const identity of cursor) {
      try {
        await this.initAccount({
          uid: identity.get('inetOrgPerson.uid'),
          template: body?.template,
          variables: body?.variables,
        });
        sent += 1;
      } catch (e) {
        skipped += 1;
        this.logger.error('Error while init outdated account for ' + identity.get('inetOrgPerson.uid') + ': ' + e);
      }
    }

    return { total, sent, skipped };
  }

  // genere des octect pour completer le code qui est de 4 octets et demi
  private async getPaddingForCode(): Promise<string> {
    let code = '';
    if (await this.redis.exists('CODEPADDING')) {
      code = await this.redis.get('CODEPADDING');
    } else {
      code = crypto.randomBytes(13).toString('hex') + '0';
      await this.redis.set('CODEPADDING', code);
    }
    return code;
  }

  private async setInitState(identity: Identities, state: InitStatesEnum): Promise<Identities> {
    // on met actif l'identité
    identity.initState = state;
    identity.dataStatus = DataStatusEnum.ACTIVE;

    if (state === InitStatesEnum.SENT) {
      identity.initInfo.initDate = new Date();
      identity.initInfo.sentDate = null;
    } else if (state === InitStatesEnum.INITIALIZED) {
      identity.initInfo.sentDate = new Date();
    }

    return await identity.save();
  }

  private async updatePasswordUsageExpiration(identityId: Identities['_id']): Promise<void> {
    const policies = (await this.passwdadmService.getPolicies()) as PasswordPoliciesDto;
    const ttlSeconds = Number(policies?.passwordUsageExpirationTtlSeconds || 0);
    const expiresAt = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? new Date(Date.now() + ttlSeconds * 1000) : null;

    await this.identities.model.updateOne(
      { _id: identityId },
      {
        $set: {
          passwordUsageExpiresAt: expiresAt,
          passwordUsageReminderSentDays: [],
          passwordUsageReminderLastSentAt: null,
        },
      },
    );
  }

  public async getInitOutdatedFilter() {
    const params = await this.passwdadmService.getPolicies();
    return buildExpiredInitInvitationFilter(params?.initTokenTTL);
  }

  // sort les identites qui n ont pas repondu dans le delai à l init de leurs comptes
  public async checkInitOutDated(options?: FilterOptions): Promise<[any[], number]> {
    const filter = await this.getInitOutdatedFilter();

    return await this.identities.findAndCount(
      filter,
      {
        state: 1,
        initState: 1,
        inetOrgPerson: 1,
        additionalFields: 1,
        metadata: 1,
        dataStatus: 1,
        lifecycle: 1,
        initInfo: 1,
      },
      options,
    );
  }
}
