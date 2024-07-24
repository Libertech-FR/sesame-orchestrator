import { InjectRedis } from '@nestjs-modules/ioredis';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
import { pick } from 'radash';
import { Identities } from '../identities/_schemas/identities.schema';
import {PasswordPolicies} from "~/management/passwd/_schemas/PasswordPolicies";
import {Model} from "mongoose";
import {InjectModel} from "@nestjs/mongoose";

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

  public static readonly TOKEN_EXPIRATION = 3600;

  public constructor(
    protected readonly backends: BackendsService,
    protected readonly identities: IdentitiesService,
    @InjectRedis() private readonly redis: Redis,
    @InjectModel(PasswordPolicies.name) protected passwordPolicies: Model<PasswordPolicies>
  ) {
    super();
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
      this.logger.error("Error while changing password. " + e + ` (uid=${passwdDto?.uid})`);
      throw new BadRequestException('Une erreur est survenue : Mot de passe incorrect ou utilisateur inconnu');
    }
  }

  public async askToken(askToken: AskTokenDto): Promise<string> {
    try {
      await this.identities.findOne({ 'inetOrgPerson.uid': askToken.uid });

      const k = crypto.randomBytes(PasswdService.RANDOM_BYTES_K).toString('hex');
      const iv = crypto.randomBytes(PasswdService.RANDOM_BYTES_IV).toString('base64');
      const cipher = crypto.createCipheriv(PasswdService.TOKEN_ALGORITHM, k, iv);

      let ciphertext = cipher.update(
        JSON.stringify(<CipherData>{ uid: askToken.uid, mail: askToken.mail }),
        'utf8',
        'base64',
      );
      ciphertext += cipher.final('base64');

      await this.redis.set(
        ciphertext,
        JSON.stringify(<TokenData>{
          k,
          iv,
          tag: cipher.getAuthTag().toString('base64'),
        }),
      );
      await this.redis.expire(ciphertext, PasswdService.TOKEN_EXPIRATION);
      return ciphertext;
    } catch (e) {
      this.logger.error("Error while ask token. " + e + ` (uid=${askToken?.uid})`);
      throw new BadRequestException('Impossible de générer un token, une erreur est survenue');
    }
  }

  public async decryptToken(token: string): Promise<CipherData> {
    try {
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

  public async getPolicies(): Promise<any>{
    const passwordPolicies = await this.passwordPolicies.findOne()
    if (passwordPolicies === null){
      return new this.passwordPolicies()
    }
    return passwordPolicies
  }
}
