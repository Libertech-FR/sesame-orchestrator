import { Injectable } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AskTokenDto } from './dto/ask-token.dto';
import Redis from 'ioredis';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { AbstractQueueProcessor } from '~/_common/abstracts/abstract.queue.processor';
@Injectable()
export class PasswdService extends AbstractQueueProcessor {
  constructor(
    protected readonly configService: ConfigService,
    @InjectRedis() protected readonly redis: Redis,
  ) {
    super(configService, redis);
  }
  async change(passwd: ChangePasswordDto) {
    const job = await this.queue.add('CHANGEPWD', passwd);
    this.queueEvents.on('failed', (errors) => {
      console.log(errors);
    });
    return await job.waitUntilFinished(this.queueEvents, 30000);
  }
  async askToken(askToken: AskTokenDto) {
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
  async verifyToken(token) {
    const data = await this.decryptToken(token);
    console.log('r (verifyToken service) :  ');
    console.log(data);
    console.log('longueur' + Object.keys(data).length);
    if (Object.keys(data).length === 0) {
      return false;
    } else {
      console.log('return true');
      return true;
    }
  }
  async decryptToken(token: string) {
    const ok = await this.redis.exists(token);
    if (ok === 1) {
      const result = await this.redis.get(token);
      const cypherData = JSON.parse(result);
      console.log(cypherData);
      const decipher = crypto.createDecipheriv('aes-256-gcm', cypherData.k, cypherData.iv);
      decipher.setAuthTag(Buffer.from(cypherData.tag, 'base64'));
      const plaintext = decipher.update(token, 'base64', 'ascii');
      console.log('texte : ' + plaintext);
      //delete key
      //this.redis.del([token])
      return JSON.parse(plaintext);
    } else {
      return {};
    }
  }
  async reset(data: ResetPasswordDto) {
    const tokenData = await this.decryptToken(data.token);
    console.log(tokenData);
    if (Object.keys(tokenData).length === 0) {
      return { status: 1, error: 'invalid token' };
    }
    const backendData = { uid: tokenData.uid, newPassword: data.newPassword };
    const job = await this.queue.add('RESETPWD', backendData);
    this.queueEvents.on('failed', (errors) => {
      console.log('Erreur queue');
      console.log(errors);
    });
    return await job.waitUntilFinished(this.queueEvents, 30000);
  }
}
