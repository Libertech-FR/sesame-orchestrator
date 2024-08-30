import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  RequestTimeoutException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Document, ModifyResult, Query, Types } from 'mongoose';
import { AbstractQueueProcessor } from '~/_common/abstracts/abstract.queue.processor';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { Identities } from '~/management/identities/_schemas/identities.schema';
import { IdentitiesService } from '~/management/identities/identities.service';
import { JobState } from '../jobs/_enums/state.enum';
import { Jobs } from '../jobs/_schemas/jobs.schema';
import { JobsService } from '../jobs/jobs.service';
import { Tasks } from '../tasks/_schemas/tasks.schema';
import { TasksService } from '../tasks/tasks.service';
import { ActionType } from './_enum/action-type.enum';
import { ExecuteJobOptions } from './_interfaces/execute-job-options.interface';
import { BackendResultInterface } from "~/core/backends/_interfaces/backend-result.interface";
import { WorkerResultInterface } from "~/core/backends/_interfaces/worker-result.interface";

const DEFAULT_SYNC_TIMEOUT = 30_000;

@Injectable()
export class BackendsService extends AbstractQueueProcessor {
  public constructor(
    protected moduleRef: ModuleRef,
    protected identitiesService: IdentitiesService,
    protected jobsService: JobsService,
    protected tasksService: TasksService,
  ) {
    super({ moduleRef });
  }

  public async onModuleInit() {
    await super.onModuleInit();

    if (process.env['npm_lifecycle_event'] === 'console') {
      this.logger.debug('QUEUE CHECKER IGNORED, cli mode detected !');
      return;
    }
    this.logger.warn('ENABLE QUEUE CHECKER !');

    const jobsCompleted = await this._queue.getCompleted();
    for (const job of jobsCompleted) {
      const result = <WorkerResultInterface>(<unknown>job.returnvalue);
      if (result.jobName === ActionType.DUMP_PACKAGE_CONFIG || result?.options?.disableLogs === true) {
        return;
      }
      const isSyncedJob = await this.jobsService.model.findOneAndUpdate<Jobs>(
        { jobId: job.id, state: { $nin: [JobState.COMPLETED, JobState.FAILED] } },
        {
          $set: {
            state: JobState.COMPLETED,
            finishedAt: new Date(),
            result: job.returnvalue,
          },
        },
        { new: true },
      );
      if (isSyncedJob) {
        await this.identitiesService.model.findByIdAndUpdate(isSyncedJob?.concernedTo?.id, {
          $set: {
            state: IdentityState.SYNCED,
          },
        });
        this.logger.warn(`Job already completed, syncing... [${job.id}::COMPLETED]`);
      }
    }

    this.queueEvents.on('waiting', (payload) => this.logger.debug(`Job is now waiting... [${payload.jobId}]`));
    this.queueEvents.on('active', async (payload) => {
      this.logger.debug(`Job is now active... [${payload.jobId}]`);
      await this.jobsService.model.findOneAndUpdate<Jobs>(
        { jobId: payload.jobId, state: { $ne: JobState.COMPLETED } },
        {
          $set: {
            state: JobState.IN_PROGRESS,
            processedAt: new Date(),
          },
        },
        { new: true },
      );
    });

    this.queueEvents.on('failed', async (payload) => {
      this.logger.debug(`Job failed ! [${payload.jobId}]`);
      const failedJob = await this.jobsService.model.findOneAndUpdate<Jobs>(
        { jobId: payload.jobId, state: { $ne: JobState.COMPLETED } },
        {
          $set: {
            state: JobState.FAILED,
            finishedAt: new Date(),
            result: {
              error: {
                message: payload.failedReason,
              },
            },
          },
        },
        { new: true },
      );
      await this.identitiesService.model.findByIdAndUpdate(failedJob?.concernedTo?.id, {
        $set: {
          state: IdentityState.ON_ERROR,
        },
      });
    });

    this.queueEvents.on('completed', async (payload) => {
      let jState = JobState.COMPLETED;
      let iState = IdentityState.SYNCED;
      const result = <WorkerResultInterface>(<unknown>payload.returnvalue);
      if (result.jobName === ActionType.DUMP_PACKAGE_CONFIG || result?.options?.disableLogs === true) {
        return;
      }
      if (result.status !== 0) {
        jState = JobState.FAILED;
        iState = IdentityState.ON_ERROR;
      }
      const completedJob = await this.jobsService.model.findOneAndUpdate<Jobs>(
        { jobId: payload.jobId },
        {
          $set: {
            state: jState,
            finishedAt: new Date(),
            result: payload.returnvalue,
          },
        },
        { upsert: true, new: true },
      );

      await this.identitiesService.model.findByIdAndUpdate(completedJob?.concernedTo?.id, {
        $set: {
          state: iState,
        },
      });
      if (jState === JobState.COMPLETED) {
        this.logger.log(`Job completed... Syncing [${payload.jobId}]`);
      } else {
        this.logger.error(`Job FAILED... Syncing [${payload.jobId}]`);
      }
    });
  }

  public async syncAllIdentities(options?: ExecuteJobOptions): Promise<any> {
    const syncAllIdentities = (await this.identitiesService.find<Identities>({
      state: IdentityState.TO_SYNC,
    })) as unknown as Identities[];
    const identities = syncAllIdentities.map((identity: Identities) => {
      return {
        action: ActionType.IDENTITY_UPDATE,
        identity,
      };
    });

    const task: Tasks = await this.tasksService.create<Tasks>({
      jobs: identities.map((identity) => identity.identity._id),
    });

    const result = {};
    for (const identity of identities) {
      try {
        this.logger.debug(`Syncing identity ${identity.identity._id}`);
        const [executedJob] = await this.executeJob(
          identity.action,
          identity.identity._id,
          { identity },
          {
            ...options,
            updateStatus: true,
            task: task._id,
          },
        );
        result[identity.identity._id] = executedJob;
      } catch (err: any & HttpException) {
        this.logger.error(`Error while syncing identity ${identity.identity._id}`, err);
        result[identity.identity._id] = {
          ...err.response,
        };
      }
    }

    return result;
  }

  public async syncIdentities(payload: string[], options?: ExecuteJobOptions): Promise<any> {
    const identities: {
      action: ActionType;
      identity: Identities;
    }[] = [];

    if (!payload.length) throw new BadRequestException('No identities to sync');

    for (const key of payload) {
      const identity = await this.identitiesService.findById<Identities>(key);
      if (identity.state !== IdentityState.TO_SYNC) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: `Identity ${key} is not in state TO_SYNC`,
          identity,
        });
      }
      identities.push({
        action: ActionType.IDENTITY_UPDATE,
        identity,
      });
    }

    const task: Tasks = await this.tasksService.create<Tasks>({
      jobs: identities.map((identity) => identity.identity._id),
    });

    const result = {};
    for (const identity of identities) {
      const [executedJob] = await this.executeJob(identity.action, identity.identity._id, identity.identity, {
        ...options,
        updateStatus: true,
        task: task._id,
      });
      result[identity.identity._id] = executedJob;
    }
    return result;
  }

  public async executeJob(
    actionType: ActionType,
    concernedTo?: Types.ObjectId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    payload?: Record<string | number, any>,
    options?: ExecuteJobOptions,
  ): Promise<[Jobs, any]> {
    const job = await this.queue.add(
      actionType,
      {
        concernedTo,
        payload,
        options,
      },
      {
        ...options?.job,
        jobId: (new Types.ObjectId()).toHexString(),
        attempts: 1,
      },
    );
    const optionals = {};
    if (!options?.async) {
      optionals['processedAt'] = new Date();
      optionals['state'] = JobState.IN_PROGRESS;
    }

    let jobStore: Document<Jobs> = null;
    if (!options?.disableLogs) {
      const identity = concernedTo ? await this.identitiesService.findById<Identities>(concernedTo) : null;
      jobStore = await this.jobsService.create<Jobs>({
        jobId: job.id,
        action: actionType,
        params: payload,
        concernedTo: identity
          ? {
            $ref: 'identities',
            id: concernedTo,
            name: [identity?.inetOrgPerson?.cn, identity?.inetOrgPerson?.givenName].join(' '),
          }
          : null,
        comment: options?.comment,
        task: options?.task,
        state: JobState.CREATED,
        ...optionals,
      });
    }

    if (concernedTo && !!options?.updateStatus) {
      await this.identitiesService.model.findByIdAndUpdate(concernedTo, {
        $set: {
          state: IdentityState.PROCESSING,
        },
      });
    }

    if (!options?.async) {
      let error: Error;

      try {
        const response = await job.waitUntilFinished(this.queueEvents, options.syncTimeout || DEFAULT_SYNC_TIMEOUT);

        if (response?.status > 0) {
          const jobError: Error & { response: any } = new Error() as unknown as Error & { response: any };
          jobError.response = response;

          throw jobError;
        }

        let jobStoreUpdated: ModifyResult<Query<Jobs, Jobs>> = null;

        if (!options?.disableLogs) {
          jobStoreUpdated = await this.jobsService.update<Jobs>(jobStore._id, {
            $set: {
              state: JobState.COMPLETED,
              processedAt: new Date(),
              finishedAt: new Date(),
              result: response,
            },
          });
        }

        if (concernedTo && !!options?.updateStatus) {
          await this.identitiesService.model.findByIdAndUpdate(concernedTo, {
            $set: {
              state: IdentityState.SYNCED,
            },
          });
        }

        return [jobStoreUpdated as unknown as Jobs, response];
      } catch (err) {
        this.logger.error(`Error while executing job ${job.id}`, err);
        error = err;
      }

      const stateOfJob = await job.getState();

      let jobFailed: ModifyResult<Query<Jobs, Jobs>> = null;
      if (!options?.disableLogs) {
        jobFailed = await this.jobsService.update<Jobs>(jobStore._id, {
          $set: {
            state: JobState.FAILED,
            finishedAt: new Date(),
            result: {
              error: {
                message: error.message,
              },
            },
          },
        });
      }

      if (concernedTo && !!options?.updateStatus) {
        await this.identitiesService.model.findByIdAndUpdate(concernedTo, {
          $set: {
            state: IdentityState.ON_ERROR,
          },
        });
      }

      if (options?.timeoutDiscard && stateOfJob !== 'completed' && stateOfJob !== 'failed') {
        job.discard();

        throw new RequestTimeoutException({
          status: HttpStatus.REQUEST_TIMEOUT,
          message: `Sync job ${job.id} failed to finish in time`,
          error,
          job: jobFailed as unknown as Jobs,
        });
      }

      if (error && stateOfJob !== 'completed' && stateOfJob !== 'failed') {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          message: `Job now continue to run in background ${job.id}, timeout wait until finish reached`,
          error,
          job: jobFailed as unknown as Jobs,
        });
      }

      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        error,
        job: (error as any).response,
      });
    }

    return [jobStore?.toObject() || null, null];
  }
}
