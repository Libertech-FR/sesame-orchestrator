import { Injectable } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Queue, QueueEvents } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AskTokenDto } from './dto/ask-token.dto';
import Redis from 'ioredis';
import { ResetPasswordDto } from './dto/reset-password.dto';
@Injectable()
export class PasswdService {
  constructor(private readonly configService: ConfigService) {}
  async change(passwd: ChangePasswordDto) {
    const redisConfig = {
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
    };
    const queue = new Queue(this.configService.get('nameQueue'), {
      connection: redisConfig,
    });
    const queueEvents = new QueueEvents(this.configService.get('nameQueue'), {
      connection: redisConfig,
    });
    const job = await queue.add('CHANGEPWD', passwd);
    queueEvents.on('failed', (errors) => {
      console.log(errors);
    });
    return await job.waitUntilFinished(queueEvents, 30000);
  }
  async askToken(askToken: AskTokenDto) {
    const redisConfig = {
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      db: 1,
    };
    const redis = new Redis(redisConfig);
    const iv = crypto.randomBytes(12).toString('base64');
    const key = crypto.randomBytes(16).toString('hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const dataStruct = { uid: askToken.uid, mail: askToken.mail };
    let ciphertext = cipher.update(
      JSON.stringify(dataStruct),
      'utf8',
      'base64',
    );
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag();
    const tokenStruct = JSON.stringify({ k: key, iv: iv, tag: tag });
    await redis.set(ciphertext, tokenStruct);
    await redis.expire(ciphertext, 3600);
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
    const redisConfig = {
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      db: 1,
    };
    const redis = new Redis(redisConfig);
    const ok = await redis.exists(token);
    if (ok === 1) {
      const result = await redis.get(token);
      const cypherData = JSON.parse(result);
      console.log(cypherData);
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        cypherData.k,
        cypherData.iv,
      );
      decipher.setAuthTag(Buffer.from(cypherData.tag, 'base64'));
      const plaintext = decipher.update(token, 'base64', 'ascii');
      console.log('texte : ' + plaintext);
      //delete key
      //redis.del([token])
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
    const redisConfig = {
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
    };
    const queue = new Queue(this.configService.get('nameQueue'), {
      connection: redisConfig,
    });
    const queueEvents = new QueueEvents(this.configService.get('nameQueue'), {
      connection: redisConfig,
    });
    const backendData = { uid: tokenData.uid, newPassword: data.newPassword };
    const job = await queue.add('RESETPWD', backendData);
    queueEvents.on('failed', (errors) => {
      console.log('Erreur queue');
      console.log(errors);
    });
    return await job.waitUntilFinished(queueEvents, 30000);
  }
}
