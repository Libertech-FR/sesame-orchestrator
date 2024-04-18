import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  Body,
  Controller,
  HttpStatus,
  Logger,
  ParseIntPipe,
  Post,
  Query,
  Res,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import Redis from 'ioredis';
import { Observable, Subscriber } from 'rxjs';
import { Public } from '~/_common/decorators/public.decorator';
import { ExecuteJobDto } from './_dto/execute-job.dto';
import { BackendsService } from './backends.service';
import { SyncIdentitiesDto } from './_dto/sync-identities.dto';
import { Types } from 'mongoose';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { Identities } from '~/management/identities/_schemas/identities.schema';

function fireMessage(observer: Subscriber<MessageEvent>, channel: string, message: any, loggername: string) {
  try {
    observer.next({
      data: { channel, payload: message },
    } as MessageEvent);
    Logger.debug(`Observer send to <${channel}> with data <${message}>`, loggername);
  } catch (err) {
    Logger.error(`Observer error from <${channel}> with data <${message}>. Error: ${err}`, loggername);
  }
}

@Controller('backends')
@ApiTags('core')
export class BackendsController {
  private readonly logger = new Logger(BackendsController.name);

  constructor(
    private backendsService: BackendsService,
    @InjectRedis() protected readonly redis: Redis,
  ) {}

  @Post('sync')
  public async syncIdentities(
    @Res() res: Response,
    @Body() body: SyncIdentitiesDto,
    @Query('async') asyncQuery: string,
  ) {
    const async = /true|on|yes|1/i.test(asyncQuery);
    const data = await this.backendsService.syncIdentities(body.payload, {
      async,
    });

    return res.status(HttpStatus.ACCEPTED).json({ async, data });
  }

  @Post('syncall')
  public async syncAllIdentities(
    @Res() res: Response,
    @Body() body: SyncIdentitiesDto,
    @Query('async') asyncQuery: string,
  ) {
    const async = /true|on|yes|1/i.test(asyncQuery);
    const data = await this.backendsService.syncAllIdentities({
      async,
    });
    return res.status(HttpStatus.ACCEPTED).json({ async, data });
  }

  @Post('execute')
  public async executeJob(
    @Res() res: Response,
    @Body() body: ExecuteJobDto,
    @Query('async') asyncQuery: string,
    @Query('timeoutDiscard') timeoutDiscardQuery: string,
    @Query(
      'syncTimeout',
      new ParseIntPipe({
        optional: true,
        errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE,
      }),
    )
    syncTimeout?: number,
  ): Promise<Response> {
    const async = /true|on|yes|1/i.test(asyncQuery);
    const timeoutDiscard = /true|on|yes|1/i.test(timeoutDiscardQuery);
    const [job, response] = await this.backendsService.executeJob(
      body.action,
      new Types.ObjectId(body.id),
      body.payload,
      {
        async,
        syncTimeout,
        timeoutDiscard,
      },
    );
    return res.status(HttpStatus.ACCEPTED).json({ async, job, response });
  }

  @Public()
  @Sse('sse')
  public async sse(@Res() res: Response, @Query('key') key: string): Promise<Observable<MessageEvent>> {
    if (key !== 'hZcdVqHScVDsDFdHOdcjmufEKFJVKaS8') throw new UnauthorizedException();

    res.socket.on('close', () => {
      Logger.debug(`Observer close connection`, this.constructor.name);
    });

    return new Observable((observer) => {
      this.backendsService.queueEvents.on('added', (added) =>
        fireMessage(observer, 'job:added', added, this.constructor.name),
      );

      this.backendsService.queueEvents.on('completed', (completed) =>
        fireMessage(observer, 'job:completed', completed, this.constructor.name),
      );

      this.backendsService.queueEvents.on('failed', (failed) =>
        fireMessage(observer, 'job:failed', failed, this.constructor.name),
      );
    });
  }
}
