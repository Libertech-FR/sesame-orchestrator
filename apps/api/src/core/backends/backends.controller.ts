import { Body, Controller, Get, HttpStatus, ParseIntPipe, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ExecuteJobDto } from './_dto/execute-job.dto';
import { BackendsService } from './backends.service';
import { SyncIdentitiesDto } from './_dto/sync-identities.dto';
import { Types } from 'mongoose';
import { DeleteIdentitiesDto } from './_dto/delete-identities.dto';

@ApiTags('core/backends')
@Controller('backends')
export class BackendsController {
  public constructor(private backendsService: BackendsService) {}

  @Get('daemon/status')
  @ApiOperation({ summary: 'Statut et ping du sesame-daemon' })
  public async daemonStatus(): Promise<{ online: boolean; pingMs: number | null; error?: string; version?: string }> {
    return this.backendsService.pingDaemon();
  }

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

  @Post('undelete')
  @ApiOperation({ summary: "Restaure une liste d'identitées supprimées" })
  public async undeleteIdentities(
    @Res() res: Response,
    @Body() body: DeleteIdentitiesDto,
    @Query('async') asyncQuery: string,
  ) {
    const async = /true|on|yes|1/i.test(asyncQuery);
    const data = await this.backendsService.undeleteIdentities(body.payload, {
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
}
