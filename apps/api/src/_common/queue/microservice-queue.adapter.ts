import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import Redis from 'ioredis';
import { EventEmitter } from 'node:events';
import { firstValueFrom, TimeoutError, timeout } from 'rxjs';
import { redisOptionsFromUri } from '~/_common/functions/redis-options-from-uri';
import {
  SesameJobEvent,
  sesameJobEventsChannel,
} from '~/_common/interfaces/sesame-job-event.interface';
import {
  SesameJobMessagePayload,
  SesameQueueAdapter,
  SesameQueueEventsEmitter,
  SesameSubmittedJob,
} from '~/_common/interfaces/sesame-job.interface';

class MicroserviceQueueEventsEmitter implements SesameQueueEventsEmitter {
  public constructor(private readonly emitter: EventEmitter) {}

  public on(event: string, handler: (...args: any[]) => void): void {
    this.emitter.on(event, handler);
  }

  public off(event: string, handler: (...args: any[]) => void): void {
    this.emitter.off(event, handler);
  }
}

export class MicroserviceQueueAdapter implements SesameQueueAdapter {
  private readonly _logger = new Logger(MicroserviceQueueAdapter.name);
  private readonly _eventsEmitter: MicroserviceQueueEventsEmitter;
  private readonly _emitter = new EventEmitter();
  private _subscriber: Redis;

  public constructor(
    private readonly client: ClientProxy,
    private readonly config: ConfigService,
  ) {
    this._eventsEmitter = new MicroserviceQueueEventsEmitter(this._emitter);
  }

  public get events(): SesameQueueEventsEmitter {
    return this._eventsEmitter;
  }

  public async connect(): Promise<void> {
    const uri = this.config.get<string>('ioredis.uri');
    const queueName = this.config.get<string>('application.nameQueue');
    const eventsChannel = sesameJobEventsChannel(queueName);

    try {
      await this.client.connect();
      this._subscriber = new Redis(redisOptionsFromUri(uri, { maxRetriesPerRequest: null }));
      await this._subscriber.subscribe(eventsChannel);
      this._subscriber.on('message', (channel, raw) => {
        if (channel !== eventsChannel) return;
        try {
          const event = JSON.parse(raw) as SesameJobEvent;
          this._dispatchJobEvent(event);
        } catch (error) {
          this._logger.warn(`Invalid job event on ${channel}: ${error}`);
        }
      });
      this._logger.log(
        `Redis microservice client connected (jobs="${queueName}", events="${eventsChannel}", redis=${uri})`,
      );
    } catch (error) {
      this._logger.error(
        `Redis microservice client failed to connect (jobs="${queueName}", redis=${uri}). ` +
          'Vérifiez SESAME_REDIS_URI (ex. redis://sesame-redis:6379/0 dans Docker).',
      );
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this._subscriber?.quit();
    await this.client.close();
  }

  public async add(
    name: string,
    data: Record<string, unknown>,
    options?: { jobId?: string },
    isAsync?: boolean,
  ): Promise<SesameSubmittedJob> {
    const jobId = options?.jobId ?? `${Date.now()}`;
    const payload: SesameJobMessagePayload = {
      id: jobId,
      name,
      data,
    };
    const pattern = this.config.get<string>('application.nameQueue');

    if (isAsync) {
      this.client.emit(pattern, payload);
      this._emitter.emit('added', { jobId, name });
    }

    return {
      id: jobId,
      waitUntilFinished: async (timeoutMs) => {
        try {
          const result = await firstValueFrom(
            this.client.send(pattern, payload).pipe(timeout({ each: timeoutMs })),
          );
          return result;
        } catch (error) {
          if (error instanceof TimeoutError) {
            const timeoutError = new Error(`Sync job ${jobId} timed out after ${timeoutMs}ms`);
            timeoutError.name = 'TimeoutError';
            throw timeoutError;
          }
          throw error;
        }
      },
      getState: async () => (isAsync ? 'waiting' : 'unknown'),
      discard: async () => undefined,
    };
  }

  public async getCompleted(): Promise<Array<{ id: string; name: string; returnvalue: unknown }>> {
    return [];
  }

  private _dispatchJobEvent(event: SesameJobEvent): void {
    switch (event.event) {
      case 'active':
        this._emitter.emit('active', { jobId: event.jobId, name: event.name });
        break;
      case 'progress':
        this._emitter.emit('progress', {
          jobId: event.jobId,
          name: event.name,
          progress: event.progress,
        });
        break;
      case 'completed':
        this._emitter.emit('completed', {
          jobId: event.jobId,
          name: event.name,
          returnvalue: event.returnvalue,
        });
        break;
      case 'failed':
        this._emitter.emit('failed', {
          jobId: event.jobId,
          name: event.name,
          failedReason: event.failedReason,
        });
        break;
      default:
        break;
    }
  }
}
