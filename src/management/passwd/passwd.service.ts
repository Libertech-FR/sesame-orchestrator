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
import { IdentitiesService } from '../identities/identities.service';
import { get, pick } from 'radash';
import { Identities } from '../identities/_schemas/identities.schema';
<<<<<<< HEAD
import { MailerService } from '@nestjs-modules/mailer';
import { InitAccountDto } from '~/management/passwd/_dto/init-account.dto';
import { ConfigService } from '@nestjs/config';
import { ResetByCodeDto } from '~/management/passwd/_dto/reset-by-code.dto';
import { PasswdadmService } from '~/settings/passwdadm.service';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { InitResetDto } from '~/management/passwd/_dto/init-reset.dto';
import { PasswordPoliciesDto } from '~/settings/_dto/password-policy.dto';
import { SmsadmService } from '~/settings/smsadm.service';
import { InitManyDto } from '~/management/passwd/_dto/init-many.dto';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';
import { MailadmService } from '~/settings/mailadm.service';
=======
import {MailerModule, MailerService} from "@nestjs-modules/mailer";
import {InitAccountDto} from "~/management/passwd/_dto/init-account.dto";
import {ConfigService} from "@nestjs/config";
import {randomInt} from "crypto";
import {ResetByCodeDto} from "~/management/passwd/_dto/reset-by-code-dto";
import {PasswdadmService} from "~/settings/passwdadm/passwdadm.service";
import {IdentityState} from "~/management/identities/_enums/states.enum";
import {InitResetDto} from "~/management/passwd/_dto/init-reset.dto";
import {SmsService} from "~/management/passwd/sms-service";
<<<<<<< HEAD
import {PasswordPoliciesDto} from "~/settings/passwdadm/dto/password-policy.dto";
>>>>>>> 85a4ce7 (save)
=======
import {PasswordPoliciesDto} from "~/settings/passwdadm/_dto/password-policy.dto";
>>>>>>> 49e1ae0 (save)

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

  public constructor(
    protected readonly backends: BackendsService,
    protected readonly identities: IdentitiesService,
    protected mailer: MailerService,
    protected config: ConfigService,
    private passwdadmService: PasswdadmService,
    private smsadmService: SmsadmService,
    private mailadmService: MailadmService,
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
      //prise des parametres
      const params = await this.passwdadmService.getPolicies();
      const k = randomInt(100000, 999999);
      //asking for padding
      const padd = await this.getPaddingForCode();
      const mailAttribute = params.emailAttribute;
      const mail = <string>get(identity.toObject(), mailAttribute);
      const token = await this.askToken({ mail: mail, uid: initDto.uid }, padd + k.toString(16), params.resetCodeTTL);
      this.logger.log('Token :' + token + '  int : ' + k.toString(10));
      if (initDto.type === 0) {
        this.logger.log('Reset password asked by mail for  : ' + initDto.uid);
        const smtpParams = await this.mailadmService.getParams();
        if (mailAttribute !== '') {
          const displayName = identity.inetOrgPerson.displayName;
          this.mailer
            .sendMail({
              from: smtpParams.sender,
              to: mail,
              subject: 'Reinitialisation de votre mot de passe',
              template: 'resetaccount',
              context: {
                uid: identity.inetOrgPerson.uid,
                displayName: displayName,
                code: k,
              },
            })
            .then(() => {
              this.logger.log('reset compte envoyé  pour uid' + initDto.uid + ' à ' + mail);
            })
            .catch((e) => {
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
<<<<<<< HEAD
        const policies = new PasswordPoliciesDto();
        if (policies.resetBySms === true) {
          this.logger.log('Reset password asked by SMS for  : ' + initDto.uid);
          const smsAttribute = params.mobileAttribute;
          if (smsAttribute !== '') {
            const numTel = <string>get(identity.toObject(), smsAttribute);
            await this.smsadmService.send(numTel, 'Votre code de reinitialisation : ' + k.toString(10));
=======
        const policies=new PasswordPoliciesDto()
        if (policies.resetBySms === true){
          this.logger.log("Reset password asked by SMS for  : " + initDto.uid )
          const smsAttribute=this.config.get('frontPwd.identityMobileAttribute')
          if (smsAttribute !== ''){
            const numTel = <string>get(identity.toObject(), smsAttribute)
            this.smsService.send(numTel,"Votre code de reinitialisation : " + k.toString(10))
>>>>>>> 85a4ce7 (save)
          }
          return token;
        } else {
          return false;
        }
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
  public async initAccount(initDto: InitAccountDto): Promise<any> {
    //recherche de l'identity
    try {
      const identity = (await this.identities.findOne({ 'inetOrgPerson.uid': initDto.uid })) as Identities;
      //envoi du mail
      const params = await this.passwdadmService.getPolicies();
      const mailAttribute = params.emailAttribute;
      this.logger.log('mailer.identityMailAttribute : ' + mailAttribute);
      if (mailAttribute !== '') {
        const mail = <string>get(identity.toObject(), mailAttribute);
        const smtpParams = await this.mailadmService.getParams();
        //demande du token
        const k = crypto.randomBytes(PasswdService.RANDOM_BYTES_K).toString('hex');
        const token = await this.askToken({ mail: mail, uid: initDto.uid }, k, params.initTokenTTL);
        //envoi du token
        this.mailer
          .sendMail({
            from: smtpParams.sender,
            to: mail,
            subject: 'Activation de votre compte',
            template: 'initaccount',
            context: {
              uid: initDto.uid,
              url: this.config.get('frontPwd.url') + '/initaccount/' + token,
            },
          })
          .then(() => {
            this.logger.log('Init compte envoyé  pour uid' + initDto.uid + ' à ' + mail);
            this.setInitState(identity, InitStatesEnum.SENT);
          })
          .catch((e) => {
            this.logger.error('Erreur serveur lors de l envoi du mail' + e);
            throw new BadRequestException({
              message: 'Erreur serveur lors de l envoi du mail' + e,
              error: 'Bad Request',
              statusCode: 400,
            });
          });

        return true;
      } else {
        this.logger.error('Error while initAccount identityMailAttribute not defined');
        return false;
      }
    } catch (e) {
      this.logger.error('Error while initialize password. ' + e + ` (uid=${initDto?.uid})`);
      return false;
    }
  }
  //Changement du password
  public async change(passwdDto: ChangePasswordDto): Promise<[Jobs, any]> {
    try {
      const identity = (await this.identities.findOne({
        'inetOrgPerson.uid': passwdDto.uid,
        state: IdentityState.SYNCED,
      })) as Identities;
      //verification de la police de mdp
      if ((await this.passwdadmService.checkPolicies(passwdDto.newPassword)) === false) {
        throw new BadRequestException({
          message: 'Une erreur est survenue : Le mot de passe ne respecte pas la politique des mots de passe',
          error: 'Bad Request',
          statusCode: 400,
        });
      }
      //tout est ok en envoie au backend
      return await this.backends.executeJob(
        ActionType.IDENTITY_PASSWORD_CHANGE,
        identity._id,
        {
          ...passwdDto,
          ...pick(identity.toJSON(), ['inetOrgPerson']),
        },
        {
          async: false,
          timeoutDiscard: true,
          disableLogs: true,
          updateStatus: false,
        },
      );
    } catch (e) {
      let job = undefined;
      let _debug = undefined;
      this.logger.error('Error while changing password. ' + e + ` (uid=${passwdDto?.uid})`);

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
      const [_, response] = await this.backends.executeJob(
        ActionType.IDENTITY_PASSWORD_RESET,
        identity._id,
        { uid: tokenData.uid, newPassword: data.newpassword, ...pick(identity, ['inetOrgPerson']) },
        {
          async: false,
          timeoutDiscard: true,
          disableLogs: true,
          updateStatus: false,
        },
      );

      if (response?.status === 0) {
        this.logger.log('delete key');
        await this.redis.del(data.token);
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

      const [_, response] = await this.backends.executeJob(
        ActionType.IDENTITY_PASSWORD_RESET,
        identity._id,
        { uid: tokenData.uid, newPassword: data.newPassword, ...pick(identity, ['inetOrgPerson']) },
        {
          async: false,
          timeoutDiscard: true,
          disableLogs: true,
          updateStatus: false,
        },
      );

      if (response?.status === 0) {
        await this.redis.del(data.token);
        await this.setInitState(identity, InitStatesEnum.INITIALIZED);
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
      throw new HttpException('Aucune identité trouvée.', 404);
    }
    const updated = await Promise.all(
      identities.map((identity) => {
        this.logger.verbose('send To :' + identity.get('inetOrgPerson.uid'));
        return this.initAccount({ uid: identity.get('inetOrgPerson.uid') });
      }),
    );
    return updated as any;
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
  private async setInitState(identity: Identities, state: InitStatesEnum): Promise<any> {
    identity.initState = state;
    if (state === InitStatesEnum.SENT) {
      identity.initInfo.initDate = new Date();
      identity.initInfo.sentDate = null;
    } else if (state === InitStatesEnum.INITIALIZED) {
      identity.initInfo.sentDate = new Date();
    }
    const ok = await identity.save();
    return ok;
  }
  // sort les identites qui n ont pas repondu dans le delai à l init de leurs comptes
  public async checkInitOutDated(): Promise<any> {
    const date = new Date();
    const params = await this.passwdadmService.getPolicies();
    date.setTime(date.getTime() - params.initTokenTTL * 1000);
    console.log('modifié:' + date);
    const identities = await this.identities.find({
      initState: InitStatesEnum.SENT,
      'initInfo.initDate': { $lt: date },
    });
    return identities;
  }
}
