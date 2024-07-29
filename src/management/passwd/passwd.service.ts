import { InjectRedis } from '@nestjs-modules/ioredis';
import { BadRequestException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import { ActionType } from '~/core/backends/_enum/action-type.enum';
import { BackendsService } from '~/core/backends/backends.service';
import { Jobs } from '~/core/jobs/_schemas/jobs.schema';
import { AskTokenDto } from './dto/ask-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { IdentitiesService } from '../identities/identities.service';
import { pick,get } from 'radash';
import { Identities } from '../identities/_schemas/identities.schema';
import {MailerModule, MailerService} from "@nestjs-modules/mailer";
import {InitAccountDto} from "~/management/passwd/dto/init-account.dto";
import {ConfigService} from "@nestjs/config";
import {randomInt} from "crypto";
import {ResetByCodeDto} from "~/management/passwd/dto/reset-by-code-dto";

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
  public static readonly RANDOM_BYTES_CODE = 5;

  public static readonly TOKEN_ALGORITHM = 'aes-256-gcm';

  public static readonly TOKEN_EXPIRATION = 604800;
  public static readonly CODE_EXPIRATION = 900;
  public static readonly CODE_PADDING = '000000000000000000000000000'
  public constructor(
    protected readonly backends: BackendsService,
    protected readonly identities: IdentitiesService,
    protected mailer: MailerService,
    protected config: ConfigService,
    @InjectRedis() private readonly redis: Redis
  ) {
    super();
  }
  public async initReset(initDto: InitAccountDto):Promise<any>{
    //envoi du mail
    try{
      const identity = await this.identities.findOne({ 'inetOrgPerson.uid': initDto.uid }) as Identities;
      const mailAttribute=this.config.get('frontPwd.identityMailAttribute')
      this.logger.log("Reset passord asked for  : " + initDto.uid )
      if (mailAttribute !== '') {
        const mail = <string>get(identity.toObject(), mailAttribute)
        const displayName=identity.inetOrgPerson.displayName
        //const k=crypto.randomBytes(PasswdService.RANDOM_BYTES_CODE).toString('hex')
        const k = randomInt(100000, 999999);
        //asking for padding
        const padd = await this.getPaddingForCode()
        const token = await this.askToken({mail: mail, uid: initDto.uid}, padd + k.toString(16),PasswdService.CODE_EXPIRATION)
        this.logger.log("Token :" + token + '  int : ' + k.toString(10))
        this.mailer.sendMail({
          from: this.config.get('mailer.sender'),
          to: mail,
          subject: 'Reinitialisation de votre mot de passe',
          template: "resetaccount",
          context:{
            uid: identity.inetOrgPerson.uid,
            displayName: displayName,
            code: k
          }

        })
          .then(() => {
            this.logger.log("reset compte envoyé  pour uid" +initDto.uid +" à " + mail )
          })
          .catch((e) => {
            throw new BadRequestException({
              message: 'Erreur serveur lors de l envoi du mail',
              error: "Bad Request",
              statusCode: 400
            });
          })
        return token
      }else{
        return false
      }
    }catch(e){
      this.logger.error("Error while reseting password. " + e + ` (uid=${initDto?.uid})`);
      //on retoune un token qui ne sert à rien pour ne pas divulguer que l uid n existe pas
      const k=crypto.randomBytes(PasswdService.RANDOM_BYTES_K).toString('hex');
      const falseToken=await this.askToken({mail: 'xxxxxx@xxxxxxxxxxx', uid: 'xxxxxxxx@xxxxxxx'},  k,0)
      return falseToken
    }


  }
  public async initAccount(initDto: InitAccountDto):Promise<any>{
    //recherche de l'identity
    try{
      const identity = await this.identities.findOne({ 'inetOrgPerson.uid': initDto.uid }) as Identities;
      //envoi du mail
      const mailAttribute=this.config.get('frontPwd.identityMailAttribute')
      this.logger.log("mailer.identityMailAttribute : " +mailAttribute )
      if (mailAttribute !== '') {
        const mail = <string>get(identity.toObject(), mailAttribute)
        //demande du token
        const k = crypto.randomBytes(PasswdService.RANDOM_BYTES_K).toString('hex');
        const token = await this.askToken({mail: mail, uid: initDto.uid},k,PasswdService.TOKEN_EXPIRATION)
        //envoi du token
        this.mailer.sendMail({
          from: this.config.get('mailer.sender'),
          to: mail,
          subject: 'Activation de votre compte',
          template: "initaccount",
          context:{
            uid: initDto.uid,
            url:this.config.get('frontPwd.url')+'/initaccount/'+ token
          }

        })
          .then(() => {
            this.logger.log("Init compte envoyé  pour uid" +initDto.uid +" à " + mail )
          })
          .catch((e) => {
            throw new BadRequestException({
              message: 'Erreur serveur lors de l envoi du mail',
              error: "Bad Request",
              statusCode: 400,
              job,
              _debug,
            });
          })

        return true
      }else{
        this.logger.error("Error while initAccount identityMailAttribute nor defined");
        return false
      }
    }catch(e){
      this.logger.error("Error while initialize password. " + e + ` (uid=${initDto?.uid})`);
      return false
    }

  }
  public async change(passwdDto: ChangePasswordDto): Promise<[Jobs, any]> {
    try {
      const identity = await this.identities.findOne({ 'inetOrgPerson.uid': passwdDto.uid }) as Identities;

      return await this.backends.executeJob(ActionType.IDENTITY_PASSWORD_CHANGE, identity._id, {
        ...passwdDto,
        ...pick(identity.toJSON(), ['inetOrgPerson']),
      }, {
        async: false,
        timeoutDiscard: true,
        disableLogs: true,
        updateStatus: false,
      });
    } catch (e) {
      let job = undefined;
      let _debug = undefined;
      this.logger.error("Error while changing password. " + e + ` (uid=${passwdDto?.uid})`);

      if (e?.response?.status === HttpStatus.BAD_REQUEST) {
        job = {};
        job['status'] = e?.response?.job?.status;
      }

      if (process.env.NODE_ENV === 'development') {
        _debug = e?.response?.error?.response;
      }

      throw new BadRequestException({
        message: 'Une erreur est survenue : Mot de passe incorrect ou utilisateur inconnu',
        error: "Bad Request",
        statusCode: 400,
        job,
        _debug,
      });
    }
  }

 public async askToken(askToken: AskTokenDto,k,ttl): Promise<string> {
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
      if (ttl >0){
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
      this.logger.error("Error while ask token. " + e + ` (uid=${askToken?.uid})`);
      throw new BadRequestException('Impossible de générer un token, une erreur est survenue');
    }
  }
  public async decryptTokenWithCode(token: string,code: number): Promise<CipherData> {
    try {
      token=decodeURIComponent(token)
      const result = await this.redis.get(token);
      const cypherData: TokenData = JSON.parse(result);

      if (cypherData?.iv === undefined || cypherData?.k === undefined || cypherData?.tag === undefined) {
        throw new NotFoundException('Invalid token');
      }
      const padd=this.getPaddingForCode();
      const k=padd + code.toString(16)
      const decipher = crypto.createDecipheriv(PasswdService.TOKEN_ALGORITHM, k, cypherData.iv);
      decipher.setAuthTag(Buffer.from(cypherData.tag, 'base64'));
      const plaintext = decipher.update(token, 'base64', 'ascii');
      return JSON.parse(plaintext);
    } catch (error) {
      this.logger.verbose("Error while decrypting token. " + error + ` (token=${token})`);
      throw new BadRequestException('Invalid token');
    }
  }
  public async decryptToken(token: string): Promise<CipherData> {
    try {
      token=decodeURIComponent(token)
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
      this.logger.verbose("Error while decrypting token. " + error + ` (token=${token})`);
      throw new BadRequestException('Invalid token');
    }
  }
  public async resetByCode(data:ResetByCodeDto):Promise<[Jobs,any]>{
    const tokenData=await this.decryptTokenWithCode(data.token,data.code)
    try{
      const identity = await this.identities.findOne({ 'inetOrgPerson.uid': tokenData.uid }) as Identities;
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
        return [_, response];
      }
      this.logger.error("Error from backend while reseting password by code" );
      throw new InternalServerErrorException('Une erreur est survenue : Impossible de réinitialiser le mot de passe');
    }catch (e) {
      this.logger.error("Error while reseting password by code. " + e + ` (token=${data?.token})`);
      throw new BadRequestException('Une erreur est survenue : Tentative de réinitialisation de mot de passe impossible');
    }
  }
  public async reset(data: ResetPasswordDto): Promise<[Jobs, any]> {
    const tokenData = await this.decryptToken(data.token);

    try {
      const identity = await this.identities.findOne({ 'inetOrgPerson.uid': tokenData.uid }) as Identities;

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
        return [_, response];
      }

      throw new InternalServerErrorException('Une erreur est survenue : Impossible de réinitialiser le mot de passe');

    } catch (e) {
      this.logger.error("Error while reseting password. " + e + ` (token=${data?.token})`);
      throw new BadRequestException('Une erreur est survenue : Tentative de réinitialisation de mot de passe impossible');
    }
  }
  // genere des octect pour completer le code qui est de 4 octets et demi
  private async getPaddingForCode(): Promise<string>{
     let code = ""
     if ( await this.redis.exists('CODEPADDING')){
       code = await this.redis.get('CODEPADDING')
     }else{
       code = crypto.randomBytes(13).toString('hex') +'0';
       await this.redis.set('CODEPADDING',code)
     }
     return code
  }


}
