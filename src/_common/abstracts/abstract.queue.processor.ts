import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

export abstract class AbstractQueueProcessor {
  protected readonly queue: Queue;
  protected readonly queueEvents: QueueEvents;
  public constructor(
    protected readonly config: ConfigService,
    protected readonly redis: Redis,
  ) {
    this.queue = new Queue(this.config.get('nameQueue'), {
      connection: this.redis,
    });
    this.queueEvents = new QueueEvents(this.config.get('nameQueue'), {
      connection: this.redis,
    });
  }
}
