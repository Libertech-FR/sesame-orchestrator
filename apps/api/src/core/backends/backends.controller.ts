import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  Body,
  Controller,
  Header,
  HttpStatus,
  Logger,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import Redis from 'ioredis';
import { Observable, Subscriber } from 'rxjs';
import { Public } from '~/_common/decorators/public.decorator';
import { ExecuteJobDto } from './_dto/execute-job.dto';
import { BackendsService } from './backends.service';
import { SyncIdentitiesDto } from './_dto/sync-identities.dto';
import { Types } from 'mongoose';
import { ActionType } from './_enum/action-type.enum';
import { DeleteIdentitiesDto } from './_dto/delete-identities.dto';
import { hash } from 'crypto';
import { AgentsService } from '../agents/agents.service';
import { Agents } from '../agents/_schemas/agents.schema';

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

@ApiTags('core/backends')
@Controller('backends')
export class BackendsController {
  private readonly logger = new Logger(BackendsController.name);

  constructor(
    private agentsService: AgentsService,
    private backendsService: BackendsService,
    @InjectRedis() protected readonly redis: Redis,
  ) { }

  @Post('delete')
  @ApiOperation({ summary: "Supprime une liste d'identitées" })
  public async deleteIdentities(
    @Res() res: Response,
    @Body() body: DeleteIdentitiesDto,
    @Query('async') asyncQuery: string,
  ) {
    const async = /true|on|yes|1/i.test(asyncQuery);
    const data = await this.backendsService.deleteIdentities(body.payload, {
      async,
    });

    return res.status(HttpStatus.ACCEPTED).json({ async, data });
  }

  @Post('sync')
  @ApiOperation({ summary: "Synchronise une liste d'identitées" })
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
  @ApiOperation({ summary: 'Synchronise toutes les identitées à synchroniser' })
  public async syncAllIdentities(@Res() res: Response, @Query('async') asyncQuery: string) {
    const async = /true|on|yes|1/i.test(asyncQuery);
    const data = await this.backendsService.syncAllIdentities({
      async: false,
    });
    return res.status(HttpStatus.ACCEPTED).json({ async, data });
  }

  @Post('execute')
  @ApiOperation({ summary: 'Execute un backend manuellement' })
  public async executeJob(
    @Res() res: Response,
    @Body() body: ExecuteJobDto,
    @Query('async') asyncQuery: string,
    @Query('timeoutDiscard') timeoutDiscardQuery: string,
    @Query('disableLogs') disableLogsQuery: string,
    @Query('updateStatus') updateStatusQuery: string,
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
    const disableLogs = /true|on|yes|1/i.test(disableLogsQuery);
    const updateStatus = /true|on|yes|1/i.test(updateStatusQuery);
    const [job, response] = await this.backendsService.executeJob(
      body.action,
      body.id ? new Types.ObjectId(body.id) : null,
      body.payload,
      {
        async,
        syncTimeout,
        timeoutDiscard,
        disableLogs,
        updateStatus,
      },
    );
    return res.status(HttpStatus.ACCEPTED).json({ async, job, response });
  }

  @Public()
  @Sse('sse')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  @ApiOperation({ summary: 'Server Sent Event - Récupère en temps réel les Jobs et affiche leurs état' })
  public async sse(@Res() res: Response, @Query('id') id: string, @Query('key') key: string): Promise<Observable<MessageEvent>> {
    if (!id || !key) throw new UnauthorizedException();
    const user = await this.agentsService.findById<Agents>(id);
    if (!user) throw new UnauthorizedException();
    if (key !== hash('sha256', user.security.secretKey)) throw new UnauthorizedException();

    res.setTimeout(0);
    res.socket.setKeepAlive?.(true);

    res.socket.on('close', () => {
      Logger.debug(`Observer close connection`, this.constructor.name);
    });

    return new Observable((observer) => {
      const heartbeat = setInterval(() => {
        observer.next({ type: 'ping', data: 'keepalive' } as MessageEvent);
      }, 15_000);

      observer.next({ retry: 10_000 } as unknown as MessageEvent);

      const onAdded = (added) => {
        if (
          ![ActionType.IDENTITY_UPDATE, ActionType.IDENTITY_CREATE, ActionType.IDENTITY_DELETE].includes(
            <ActionType>added.name,
          )
        )
          return;
        return fireMessage(observer, 'job:added', added, this.constructor.name);
      };

      const onCompleted = (completed) => {
        return fireMessage(observer, 'job:completed', completed, this.constructor.name);
      };

      const onFailed = (failed) => {
        return fireMessage(observer, 'job:failed', failed, this.constructor.name);
      };

      this.backendsService.queueEvents.on('added', onAdded);
      this.backendsService.queueEvents.on('completed', onCompleted);
      this.backendsService.queueEvents.on('failed', onFailed);

      const cleanup = () => {
        clearInterval(heartbeat);
        this.backendsService.queueEvents.off('added', onAdded);
        this.backendsService.queueEvents.off('completed', onCompleted);
        this.backendsService.queueEvents.off('failed', onFailed);
        try { observer.complete?.(); } catch { }
        Logger.debug(`Observer close connection`, BackendsController.name);
      };

      res.on('close', cleanup);

      return cleanup;
    });
  }
}
