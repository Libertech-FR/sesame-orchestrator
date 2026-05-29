import { AbstractService, AbstractServiceContext } from './abstract.service';
import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SesameQueueAdapter } from '~/_common/interfaces/sesame-job.interface';
import { SESAME_QUEUE } from '~/_common/queue/sesame-queue.constants';

export abstract class AbstractQueueProcessor extends AbstractService implements OnModuleInit {
  protected config: ConfigService;
  protected sesameQueue: SesameQueueAdapter;

  public get queue(): SesameQueueAdapter {
    return this.sesameQueue;
  }

  public get queueEvents(): SesameQueueAdapter['events'] {
    return this.sesameQueue.events;
  }

  public constructor(context?: AbstractServiceContext) {
    super(context);
    if (!this.moduleRef) throw new Error('ModuleRef is not defined in ' + this.constructor.name);
  }

  public async onModuleInit() {
    this.config = this.moduleRef.get<ConfigService>(ConfigService, { strict: false });
    this.sesameQueue = this.moduleRef.get<SesameQueueAdapter>(SESAME_QUEUE, { strict: false });
    await this.sesameQueue.connect();
  }
}
