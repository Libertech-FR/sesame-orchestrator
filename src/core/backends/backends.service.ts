import { BadRequestException, HttpStatus, Injectable, RequestTimeoutException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Job } from 'bullmq';
import { AbstractQueueProcessor } from '~/_common/abstracts/abstract.queue.processor';
import { ActionType } from './_enum/action-type.enum';
import { ExecuteJobOptions } from './_interfaces/execute-job-options.interface';

const DEFAULT_SYNC_TIMEOUT = 30_000;

@Injectable()
export class BackendsService extends AbstractQueueProcessor {
  public constructor(protected moduleRef: ModuleRef) {
    super({ moduleRef });
  }

  public async executeJob(
    actionType: ActionType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    payload?: Record<string | number, any>,
    options?: ExecuteJobOptions,
  ): Promise<[Job, any]> {
    const job = await this.queue.add(actionType, payload, options?.job);
    if (!options?.async) {
      let error: Error;
      try {
        const response = await job.waitUntilFinished(this.queueEvents, options.syncTimeout || DEFAULT_SYNC_TIMEOUT);
        return [job, response];
      } catch (err) {
        error = err;
      }
      if (options?.timeoutDiscard !== false) {
        job.discard();
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: `Sync job ${job.id} failed to finish in time`,
          error,
          job,
        });
      }
      throw new RequestTimeoutException({
        status: HttpStatus.REQUEST_TIMEOUT,
        message: `Job now continue to run in background ${job.id}, timeout wait until finish reached`,
        error,
        job,
      });
    }
    return [job, null];
  }
}
