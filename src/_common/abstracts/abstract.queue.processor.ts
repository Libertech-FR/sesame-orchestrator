import { Queue, QueueEvents } from 'bullmq';
import { AbstractService, AbstractServiceContext } from './abstract.service';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export abstract class AbstractQueueProcessor extends AbstractService implements OnModuleInit {
  protected config: ConfigService;

  private redis: Redis;
  protected _queue: Queue;
  public queueEvents: QueueEvents;

  public get queue(): Queue {
    return this._queue;
  }

  public constructor(context?: AbstractServiceContext) {
    super(context);
    if (!this.moduleRef) throw new Error('ModuleRef is not defined in ' + this.constructor.name);
  }

  public async onModuleInit() {
    this.config = this.moduleRef.get<ConfigService>(ConfigService, { strict: false });
    this.redis = this.moduleRef.get<Redis>(getRedisConnectionToken(), { strict: false });

    this._queue = new Queue(this.config.get<string>('application.nameQueue'), {
      connection: this.redis,
    });
    this.queueEvents = new QueueEvents(this.config.get<string>('application.nameQueue'), {
      connection: this.redis,
    });
  }
}
