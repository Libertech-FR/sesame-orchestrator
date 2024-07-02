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
  ) {
    super();
  }

  public async change(passwdDto: ChangePasswordDto): Promise<[Jobs, any]> {
    const identity = await this.identities.findOne({ 'inetOrgPerson.uid': passwdDto.uid }) as Identities;

    return await this.backends.executeJob(ActionType.IDENTITY_PASSWORD_CHANGE, identity._id, {
      ...passwdDto,
      ...pick(identity, ['inetOrgPerson']),
    }, {
      async: false,
    });
  }

  public async askToken(askToken: AskTokenDto): Promise<string> {
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
  }

  public async decryptToken(token: string): Promise<CipherData> {
    try {
      const result = await this.redis.get(token);
      const cypherData: TokenData = JSON.parse(result);

      const decipher = crypto.createDecipheriv(PasswdService.TOKEN_ALGORITHM, cypherData.k, cypherData.iv);
      decipher.setAuthTag(Buffer.from(cypherData.tag, 'base64'));
      const plaintext = decipher.update(token, 'base64', 'ascii');

      return JSON.parse(plaintext);
    } catch (error) {
      throw new BadRequestException('Invalid token');
    }
  }

  public async reset(data: ResetPasswordDto): Promise<[Jobs, any]> {
    const tokenData = await this.decryptToken(data.token);
    const identity = await this.identities.findOne({ 'inetOrgPerson.uid': tokenData.uid }) as Identities;

    return await this.backends.executeJob(
      ActionType.IDENTITY_PASSWORD_RESET,
      identity._id,
      { uid: tokenData.uid, newPassword: data.newPassword, ...pick(identity, ['inetOrgPerson']) },
      {
        async: false,
      },
    );
  }
}
