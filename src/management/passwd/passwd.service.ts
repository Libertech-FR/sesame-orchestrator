import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import { ActionType } from '~/core/backends/_enum/action-type.enum';
import { BackendsService } from '~/core/backends/backends.service';
import { Jobs } from '~/core/jobs/_schemas/jobs.schema';
import { AskTokenDto } from './dto/ask-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Types } from 'mongoose';

@Injectable()
export class PasswdService extends AbstractService {
  public constructor(
    protected backends: BackendsService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super();
  }

  public async change(passwd: ChangePasswordDto): Promise<[Jobs, any]> {
    return await this.backends.executeJob(ActionType.IDENTITY_PASSWORD_CHANGE, new Types.ObjectId(passwd.id), passwd, {
      async: false,
    });
  }

  public async askToken(askToken: AskTokenDto): Promise<string> {
    const iv = crypto.randomBytes(12).toString('base64');
    const key = crypto.randomBytes(16).toString('hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const dataStruct = { uid: askToken.uid, mail: askToken.mail };
    let ciphertext = cipher.update(JSON.stringify(dataStruct), 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag();
    const tokenStruct = JSON.stringify({ k: key, iv: iv, tag: tag });
    await this.redis.set(ciphertext, tokenStruct);
    await this.redis.expire(ciphertext, 3600);
    return ciphertext;
  }

  public async verifyToken(token: string): Promise<boolean> {
    const data = await this.decryptToken(token);
    return Object.keys(data).length === 0;
  }

  public async decryptToken(token: string): Promise<any> {
    if (!(await this.redis.exists(token))) {
      throw new Error('Token not found');
    }

    const result = await this.redis.get(token);
    const cypherData = JSON.parse(result);
    const decipher = crypto.createDecipheriv('aes-256-gcm', cypherData.k, cypherData.iv);
    decipher.setAuthTag(Buffer.from(cypherData.tag, 'base64'));
    const plaintext = decipher.update(token, 'base64', 'ascii');

    return JSON.parse(plaintext);
  }

  public async reset(data: ResetPasswordDto): Promise<[Jobs, any]> {
    const tokenData = await this.decryptToken(data.token);
    if (Object.keys(tokenData).length === 0) {
      throw new Error('Invalid token');
    }

    const backendData = { uid: tokenData.uid, newPassword: data.newPassword };
    return await this.backends.executeJob(
      ActionType.IDENTITY_PASSWORD_RESET,
      new Types.ObjectId(`${tokenData.id}`),
      backendData,
      {
        async: false,
      },
    );
  }
}
