import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectionOptions, Job, Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import {
  SesameQueueAdapter,
  SesameQueueEventsEmitter,
  SesameSubmittedJob,
} from '~/_common/interfaces/sesame-job.interface';

class BullmqQueueEventsEmitter implements SesameQueueEventsEmitter {
  public constructor(private readonly queueEvents: QueueEvents) {}

  public on(event: string, handler: (...args: any[]) => void): void {
    // BullMQ event names are validated at runtime
    (this.queueEvents as any).on(event, handler);
  }

  public off(event: string, handler: (...args: any[]) => void): void {
    (this.queueEvents as any).off(event, handler);
  }
}

export class BullmqQueueAdapter implements SesameQueueAdapter {
  private readonly _logger = new Logger(BullmqQueueAdapter.name);
  private _queue: Queue;
  private _queueEvents: QueueEvents;
  private _eventsEmitter: BullmqQueueEventsEmitter;

  public constructor(
    private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  public get events(): SesameQueueEventsEmitter {
    return this._eventsEmitter;
  }

  public async connect(): Promise<void> {
    const queueName = this.config.get<string>('application.nameQueue');
    const connection = this.redis as unknown as ConnectionOptions;

    this._queue = new Queue(queueName, { connection });
    this._queueEvents = new QueueEvents(queueName, { connection });
    await this._queueEvents.waitUntilReady();
    this._eventsEmitter = new BullmqQueueEventsEmitter(this._queueEvents);
    this._logger.log(`BullMQ queue "${queueName}" ready`);
  }

  public async close(): Promise<void> {
    await this._queueEvents?.close();
    await this._queue?.close();
  }

  public async add(
    name: string,
    data: Record<string, unknown>,
    options?: { jobId?: string; attempts?: number },
  ): Promise<SesameSubmittedJob> {
    const job = await this._queue.add(name, data, {
      jobId: options?.jobId,
      attempts: options?.attempts ?? 1,
    });
    return this.toSubmittedJob(job);
  }

  public async getCompleted(): Promise<Array<{ id: string; name: string; returnvalue: unknown }>> {
    const jobs = await this._queue.getCompleted();
    return jobs.map((job) => ({
      id: String(job.id),
      name: job.name,
      returnvalue: job.returnvalue,
    }));
  }

  private toSubmittedJob(job: Job): SesameSubmittedJob {
    return {
      id: String(job.id),
      waitUntilFinished: (timeoutMs) => job.waitUntilFinished(this._queueEvents, timeoutMs),
      getState: () => job.getState(),
      discard: async () => {
        await job.discard();
      },
    };
  }
}
