import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractQueueProcessor } from '~/_common/abstracts/abstract.queue.processor';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class BackendsService extends AbstractQueueProcessor {
  constructor(
    protected readonly configService: ConfigService,
    @InjectRedis() protected readonly redis: Redis,
  ) {
    super(configService, redis);
  }
  async list() {
    const job = await this.queue.add('LISTBACKEND', 'x');
    this.queueEvents.on('failed', (errors) => {
      console.log(errors);
    });
    return await job.waitUntilFinished(this.queueEvents, 30000);
  }
  async alive() {
    const job = await this.queue.add('PING', 'x');
    this.queueEvents.on('failed', (errors) => {
      console.log(errors);
    });
    return await job.waitUntilFinished(this.queueEvents, 30000);
  }
}
