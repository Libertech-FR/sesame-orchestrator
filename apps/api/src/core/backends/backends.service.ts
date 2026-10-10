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
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service';
import { JobState } from '../jobs/_enums/state.enum';
import { Jobs } from '../jobs/_schemas/jobs.schema';
import { JobsService } from '../jobs/jobs.service';
import { Tasks } from '../tasks/_schemas/tasks.schema';
import { TasksService } from '../tasks/tasks.service';
import { ActionType } from './_enum/action-type.enum';
import { ExecuteJobOptions } from './_interfaces/execute-job-options.interface';
import { WorkerResultInterface } from '~/core/backends/_interfaces/worker-result.interface';
import { formatWorkerResultErrorMessage } from '~/core/backends/_functions/format-worker-result-error-message.function';
import { DataStatusEnum } from '~/management/identities/_enums/data-status';
import { GroupsService } from '~/management/groups/groups.service';
import { GroupFamiliesService } from '~/management/groups/group-families.service';
import { GroupFamilies } from '~/management/groups/_schemas/group-families.schema';
import { Groups, GroupType } from '~/management/groups/_schemas/groups.schema';

const DEFAULT_SYNC_TIMEOUT = 30_000;
const DAEMON_PING_TIMEOUT_MS = 15_000;
// délai maximal d'attente de la fin des jobs d'identités avant de lancer la synchronisation des groupes
const IDENTITIES_BEFORE_GROUPS_TIMEOUT_MS = 60 * 60_000;

@Injectable()
export class BackendsService extends AbstractQueueProcessor {
  public constructor(
    protected moduleRef: ModuleRef,
    protected identitiesService: IdentitiesCrudService,
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

    const jobsCompleted = await this.queue.getCompleted();
    for (const job of jobsCompleted) {
      const result = <WorkerResultInterface>(<unknown>job.returnvalue);
      const disableLogs = result?.options?.disableLogs === true;
      if (result?.jobName === ActionType.DUMP_PACKAGE_CONFIG) {
        continue;
      }
      const isSyncedJob = await this.jobsService.model.findOneAndUpdate<Jobs>(
        { jobId: job.id, state: { $nin: [JobState.COMPLETED, JobState.FAILED] } },
        {
          $set: {
            state: JobState.COMPLETED,
            finishedAt: new Date(),
            ...(disableLogs ? {} : { result: job.returnvalue }),
          },
        },
        { new: true },
      );
      if (isSyncedJob) {
        if (isSyncedJob?.concernedTo?.$ref === 'groups') {
          await this.applyGroupJobResult(isSyncedJob.concernedTo.id, result?.jobName, true);
        } else {
          await this.identitiesService.model.findByIdAndUpdate(isSyncedJob?.concernedTo?.id, {
            $set: {
              state: IdentityState.SYNCED,
              lastBackendSync: new Date(),
            },
          });
        }
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
      if (failedJob?.concernedTo?.$ref === 'groups') {
        await this.applyGroupJobResult(failedJob.concernedTo.id, null, false);
        return;
      }
      await this.identitiesService.model.findByIdAndUpdate(failedJob?.concernedTo?.id, {
        $set: {
          state: IdentityState.ON_ERROR,
        },
      });
    });

    this.queueEvents.on('completed', async (payload) => {
      const result = <WorkerResultInterface>(<unknown>payload.returnvalue);

      if (result?.jobName === ActionType.DUMP_PACKAGE_CONFIG) {
        return;
      }
      if (!result) {
        this.logger.warn(`Job completed without return value [${payload.jobId}]`);
        return;
      }
      const disableLogs = result?.options?.disableLogs === true;
      let jState = JobState.COMPLETED;
      if (result.status !== 0) {
        jState = JobState.FAILED;
      }
      const completedJob = await this.jobsService.model.findOneAndUpdate<Jobs>(
        { jobId: payload.jobId },
        {
          $set: {
            state: jState,
            finishedAt: new Date(),
            ...(disableLogs ? {} : { result: payload.returnvalue }),
          },
        },
        { upsert: true, new: true },
      );
      if (completedJob?.concernedTo?.$ref === 'groups') {
        await this.applyGroupJobResult(completedJob.concernedTo.id, result.jobName, jState === JobState.COMPLETED);
        return;
      }
      let myState = result.jobName === ActionType.IDENTITY_DELETE ? IdentityState.DONT_SYNC : IdentityState.SYNCED;
      if (jState === JobState.COMPLETED) {
        this.logger.log(`Job completed... Syncing [${payload.jobId}]`);
      } else {
        this.logger.error(`Job FAILED... Syncing [${payload.jobId}]`);
        this.logger.error(`Set State on error [${payload.jobId}]`);
        myState = IdentityState.ON_ERROR;
      }
      await this.identitiesService.model.findByIdAndUpdate(completedJob?.concernedTo?.id, {
        $set: {
          state: myState,
          lastBackendSync: jState === JobState.COMPLETED ? new Date() : null,
          deletedFlag: result.jobName === ActionType.IDENTITY_DELETE,
        },
      });
    });
  }

  public async syncAllIdentities(options?: ExecuteJobOptions): Promise<any> {
    const syncAllIdentities = await this.identitiesService.find<any>({
      state: IdentityState.TO_SYNC,
    });
    const identities = syncAllIdentities.map((identity: any) => {
      return {
        action: ActionType.IDENTITY_UPDATE,
        identity,
      };
    });

    const task: Document<Tasks> = await this.tasksService.create<Tasks>({
      jobs: identities.map((identity) => identity.identity._id),
    });

    const result = {};
    for (const identity of identities) {
      //convertion tableau employeeNumber
      //if (identity.identity.primaryEmployeeNumber !== '' && identity.identity.primaryEmployeeNumber !== null) {
      //  identity.identity.employeeNumber = identity.identity.primaryEmployeeNumber;
      //} else {
      //  //on prend la premiere pour envoyer une chaine et non un tableau pour la compatibilité ldap
      //  identity.identity.inetOrgPerson.employeeNumber = identity.identity.inetOrgPerson.employeeNumber[0];
      //}
      try {
        this.logger.debug(`Syncing identity ${identity.identity._id}`);
        const [executedJob] = await this.executeJob(
          identity.action,
          identity.identity._id,
          { identity },
          {
            ...options,
            updateStatus: true,
            task: task._id as unknown as Types.ObjectId,
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
      const identity = await this.identitiesService.findById<any>(key);
      if (identity.state !== IdentityState.TO_SYNC) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: `Identity ${key} is not in state TO_SYNC`,
          identity,
        });
      }
      // cas des fusion l employeeNumber doit etre celui de l identite primaire
      if (identity.primaryEmployeeNumber !== null && identity.primaryEmployeeNumber !== '') {
        identity.inetOrgPerson.employeeNumber = identity.primaryEmployeeNumber;
      } else {
        //on prend la premiere pour envoyer une chaine et non un tableau pour la compatibilité ldap
        identity.inetOrgPerson.employeeNumber = identity.inetOrgPerson.employeeNumber[0];
      }
      identities.push({
        action: ActionType.IDENTITY_UPDATE,
        identity,
      });
    }

    const task: Document<Tasks> = await this.tasksService.create<Tasks>({
      jobs: identities.map((identity) => identity.identity._id),
    });

    const result = {};
    for (const identity of identities) {
      const [executedJob] = await this.executeJob(identity.action, identity.identity._id, identity.identity, {
        ...options,
        updateStatus: true,
        task: task._id as unknown as Types.ObjectId,
      });
      result[identity.identity._id] = executedJob;
    }
    return result;
  }

  public async lifecycleChangedIdentities(
    payload: (string | { id?: string; before?: Identities; after?: Identities })[],
    options?: ExecuteJobOptions,
  ): Promise<any> {
    const identities: {
      action: ActionType;
      before?: Identities;
      identity: Identities;
    }[] = [];

    if (!payload.length) throw new BadRequestException('No identities to sync');

    for (const item of payload) {
      const before = typeof item === 'string' ? undefined : item.before;
      const identityId = typeof item === 'string' ? item : item.after?._id?.toString() || item.id;
      if (!identityId) throw new BadRequestException('Missing identity id for lifecycle change');
      const identity =
        typeof item === 'string' || !item.after ? await this.identitiesService.findById<any>(identityId) : item.after;
      // cas des fusion l employeeNumber doit etre celui de l identite primaire
      if (identity.primaryEmployeeNumber !== null && identity.primaryEmployeeNumber !== '') {
        identity.inetOrgPerson.employeeNumber = identity.primaryEmployeeNumber;
      } else {
        // on prend la premiere pour envoyer une chaine et non un tableau pour la compatibilité ldap
        identity.inetOrgPerson.employeeNumber = identity.inetOrgPerson.employeeNumber[0];
      }
      identities.push({
        action: ActionType.IDENTITY_LIFECYCLE_CHANGED,
        before,
        identity,
      });
    }

    const task: Document<Tasks> = await this.tasksService.create<Tasks>({
      jobs: identities.map((identity) => identity.identity._id),
    });

    const result = {};
    for (const identity of identities) {
      const [executedJob] = await this.executeJob(
        identity.action,
        identity.identity._id,
        { before: identity.before, after: identity.identity },
        {
          ...options,
          updateStatus: true,
          task: task._id as unknown as Types.ObjectId,
          concernedToName: identity.identity.inetOrgPerson?.cn,
        },
      );
      result[identity.identity._id] = executedJob;
    }
    return result;
  }

  public async deleteIdentities(payload: string[], options?: ExecuteJobOptions): Promise<any> {
    const identities: {
      action: ActionType;
      identity: Identities;
    }[] = [];

    if (!payload.length) throw new BadRequestException('No identities to disable');

    const result = {};

    for (const key of payload) {
      try {
        const identity = await this.identitiesService.findById<any>(key);
        if (!identity) {
          result[key] = { error: `Identity ${key} not found` };
          continue;
        }
        if (identity.primaryEmployeeNumber !== null && identity.primaryEmployeeNumber !== '') {
          identity.inetOrgPerson.employeeNumber = identity.primaryEmployeeNumber;
        } else if (Array.isArray(identity.inetOrgPerson?.employeeNumber)) {
          //on prend la premiere pour envoyer une chaine et non un tableau pour la compatibilité ldap
          identity.inetOrgPerson.employeeNumber = identity.inetOrgPerson.employeeNumber[0];
        }
        if (!identity.lastBackendSync) {
          // l identité n'a jamais été symchronisée on la soft delete
          // puis on poursuit avec le reste de la sélection (suppression en masse)
          await this.identitiesService.model.findByIdAndUpdate(key, {
            $set: {
              state: IdentityState.DONT_SYNC,
              deletedFlag: true,
            },
          });
          result[key] = { softDeleted: true };
          continue;
        }
        identities.push({
          action: ActionType.IDENTITY_DELETE,
          identity,
        });
      } catch (error) {
        // une identité en erreur ne doit pas interrompre la suppression des autres
        this.logger.error(`Unable to prepare deletion of identity ${key}: ${error?.message}`, error?.stack);
        result[key] = { error: error?.message ?? 'Unknown error' };
      }
    }

    // les identités supprimées ne sont plus envoyées comme membres : leurs groupes doivent être resynchronisés
    await this.groupsService.markGroupsOfIdentitiesToSync(payload);

    if (!identities.length) return result;

    const task: Document<Tasks> = await this.tasksService.create<Tasks>({
      jobs: identities.map((identity) => identity.identity._id),
    });

    for (const identity of identities) {
      try {
        const [executedJob] = await this.executeJob(identity.action, identity.identity._id, identity.identity, {
          ...options,
          updateStatus: true,
          switchToProcessing: false,
          targetState: IdentityState.DONT_SYNC,
          dataState: DataStatusEnum.DELETED,
          task: task._id as unknown as Types.ObjectId,
        });
        result[`${identity.identity._id}`] = executedJob;
      } catch (error) {
        this.logger.error(`Unable to delete identity ${identity.identity._id}: ${error?.message}`, error?.stack);
        result[`${identity.identity._id}`] = { error: error?.message ?? 'Unknown error' };
      }
    }
    return result;
  }

  public async undeleteIdentities(payload: string[], options?: ExecuteJobOptions): Promise<any> {
    const result = {};
    void options;

    if (!payload.length) throw new BadRequestException('No identities to restore');

    for (const key of payload) {
      const identity = await this.identitiesService.findById<any>(key);
      if (!identity) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: `Identity ${key} not found`,
        });
      }

      const targetState = identity.lastBackendSync ? IdentityState.TO_SYNC : IdentityState.TO_CREATE;
      await this.identitiesService.model.findByIdAndUpdate(key, {
        $set: {
          state: targetState,
          deletedFlag: false,
          dataStatus: DataStatusEnum.NOTINITIALIZED,
        },
      });
      result[identity._id] = { restored: true, state: targetState };
    }
    await this.groupsService.markGroupsOfIdentitiesToSync(payload);

    return result;
  }

  public async disableIdentities(payload: string[], options?: ExecuteJobOptions): Promise<any> {
    const identities: {
      action: ActionType;
      identity: Identities;
    }[] = [];

    if (!payload.length) throw new BadRequestException('No identities to disable');

    for (const key of payload) {
      const identity = await this.identitiesService.findById<any>(key);
      if (!identity.lastBackendSync) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: `Identity ${key}  has never been synched`,
          identity,
        });
      }
      if (identity.primaryEmployeeNumber !== null && identity.primaryEmployeeNumber !== '') {
        identity.inetOrgPerson.employeeNumber = identity.primaryEmployeeNumber;
      } else {
        //on prend la premiere pour envoyer une chaine et non un tableau pour la compatibilité ldap
        identity.inetOrgPerson.employeeNumber = identity.inetOrgPerson.employeeNumber[0];
      }
      identities.push({
        action: ActionType.IDENTITY_DISABLE,
        identity,
      });
    }

    const task: Document<Tasks> = await this.tasksService.create<Tasks>({
      jobs: identities.map((identity) => identity.identity._id),
    });

    const result = {};
    for (const identity of identities) {
      const [executedJob, res] = await this.executeJob(identity.action, identity.identity._id, identity.identity, {
        ...options,
        updateStatus: true,
        switchToProcessing: false,
        targetState: IdentityState.SYNCED,
        dataState: DataStatusEnum.INACTIVE,
        task: task._id as unknown as Types.ObjectId,
      });
      result[identity.identity._id] = executedJob;
      console.log(res);
    }
    return result;
  }

  public async enableIdentities(payload: string[], options?: ExecuteJobOptions): Promise<any> {
    const identities: {
      action: ActionType;
      identity: Identities;
    }[] = [];

    if (!payload.length) throw new BadRequestException('No identities to disable');

    for (const key of payload) {
      const identity = await this.identitiesService.findById<any>(key);
      if (identity.primaryEmployeeNumber !== null && identity.primaryEmployeeNumber !== '') {
        identity.inetOrgPerson.employeeNumber = identity.primaryEmployeeNumber;
      } else {
        //on prend la premiere pour envoyer une chaine et non un tableau pour la compatibilité ldap
        identity.inetOrgPerson.employeeNumber = identity.inetOrgPerson.employeeNumber[0];
      }
      if (!identity.lastBackendSync) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: `Identity ${key}  has never been synched`,
          identity,
        });
      }
      identities.push({
        action: ActionType.IDENTITY_ENABLE,
        identity,
      });
    }

    const task: Document<Tasks> = await this.tasksService.create<Tasks>({
      jobs: identities.map((identity) => identity.identity._id),
    });

    const result = {};
    for (const identity of identities) {
      const [executedJob, res] = await this.executeJob(identity.action, identity.identity._id, identity.identity, {
        ...options,
        updateStatus: true,
        switchToProcessing: false,
        targetState: IdentityState.SYNCED,
        dataState: DataStatusEnum.ACTIVE,
        task: task._id as unknown as Types.ObjectId,
      });
      result[identity.identity._id] = executedJob;
      console.log(res);
    }
    return result;
  }

  public async activationIdentity(payload: string, status: boolean, options?: ExecuteJobOptions) {
    let result = null;
    if (status === true) {
      result = await this.enableIdentities([payload], options);
    } else {
      result = await this.disableIdentities([payload], options);
    }
    return result[payload];
  }
  /**
   * GroupsService est résolu à la demande pour éviter une dépendance circulaire entre modules
   */
  protected get groupsService(): GroupsService {
    return this.moduleRef.get(GroupsService, { strict: false });
  }

  protected get groupFamiliesService(): GroupFamiliesService {
    return this.moduleRef.get(GroupFamiliesService, { strict: false });
  }

  protected async setConcernedState(
    ref: ExecuteJobOptions['concernedToRef'],
    id: Types.ObjectId,
    state: IdentityState,
  ): Promise<void> {
    if (ref === 'groups') {
      await this.groupsService.model.findByIdAndUpdate(id, { $set: { state } });
      return;
    }
    await this.identitiesService.model.findByIdAndUpdate(id, { $set: { state } });
  }

  /**
   * Applique le résultat d'un job GROUP_* sur le groupe concerné
   */
  protected async applyGroupJobResult(
    groupId: Types.ObjectId,
    jobName: string | null,
    success: boolean,
  ): Promise<void> {
    if (!success) {
      await this.groupsService.model.findByIdAndUpdate(groupId, { $set: { state: IdentityState.ON_ERROR } });
      return;
    }
    if (jobName === ActionType.GROUP_DELETE) {
      await this.groupsService.model.findByIdAndDelete(groupId);
      return;
    }
    await this.groupsService.model.findByIdAndUpdate(groupId, {
      $set: {
        state: IdentityState.SYNCED,
        lastBackendSync: new Date(),
      },
    });
  }

  /**
   * Construit le payload envoyé au daemon pour un groupe : le groupe et ses membres résolus
   * (hors identités supprimées et DONT_SYNC, qui ne peuvent pas être membres)
   */
  protected async buildGroupPayload(group: Groups): Promise<Record<string, any>> {
    const members = await this.identitiesService.model
      .find(
        { _id: { $in: group.member || [] }, deletedFlag: { $ne: true }, state: { $ne: IdentityState.DONT_SYNC } },
        {
          'inetOrgPerson.cn': 1,
          'inetOrgPerson.uid': 1,
          'inetOrgPerson.mail': 1,
          'inetOrgPerson.employeeNumber': 1,
          'inetOrgPerson.employeeType': 1,
          primaryEmployeeNumber: 1,
        },
      )
      .lean<Identities[]>()
      .exec();

    const family = group.family
      ? await this.groupFamiliesService.model.findById(group.family, { name: 1 }).lean<GroupFamilies>().exec()
      : null;

    return {
      group: {
        _id: group._id,
        cn: group.cn,
        description: group.description,
        mail: group.mail,
        // nom de la famille du groupe, null si le groupe n'est rattaché à aucune famille
        family: family?.name ?? null,
        owner: group.owner || [],
        customFields: group.customFields,
      },
      members: members.map((identity) => ({
        _id: identity._id,
        cn: identity.inetOrgPerson?.cn,
        uid: identity.inetOrgPerson?.uid,
        mail: identity.inetOrgPerson?.mail,
        employeeType: identity.inetOrgPerson?.employeeType,
        // même règle que pour les identités : l'employeeNumber primaire (fusion) sinon le premier
        employeeNumber: identity.primaryEmployeeNumber || identity.inetOrgPerson?.employeeNumber?.[0],
      })),
    };
  }

  /**
   * Synchronise toutes les identités puis tous les groupes à l'état TO_SYNC.
   * Les groupes ne sont mis en file qu'une fois les jobs des identités terminés : leurs membres doivent exister
   * dans les backends. En mode async, l'attente se fait en arrière-plan sauf si `waitForGroups` est demandé.
   */
  public async syncAll(options?: ExecuteJobOptions & { waitForGroups?: boolean }): Promise<any> {
    const { waitForGroups, ...jobOptions } = options || {};
    const identities = (await this.syncAllIdentities(jobOptions)) || {};
    if (!jobOptions.async) return { ...identities, ...(await this.syncAllGroups(jobOptions)) };

    const syncGroups = async () => {
      await this.waitForJobs(
        Object.values(identities)
          .map((job: Partial<Jobs>) => job?.jobId)
          .filter(Boolean),
      );
      return await this.syncAllGroups(jobOptions);
    };
    if (waitForGroups) return { ...identities, ...(await syncGroups()) };

    syncGroups().catch((error) =>
      this.logger.error(`Unable to sync groups after identities: ${error?.message}`, error?.stack),
    );
    return identities;
  }

  /**
   * Attend la fin (succès ou échec) des jobs donnés, dans la limite de IDENTITIES_BEFORE_GROUPS_TIMEOUT_MS au total
   */
  protected async waitForJobs(jobIds: string[]): Promise<void> {
    const deadline = Date.now() + IDENTITIES_BEFORE_GROUPS_TIMEOUT_MS;
    for (const jobId of jobIds) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        this.logger.warn(
          `Identity jobs still pending after ${IDENTITIES_BEFORE_GROUPS_TIMEOUT_MS}ms, syncing groups anyway`,
        );
        return;
      }
      const job = await this.queue.getJob(jobId);
      // un job en échec ne bloque pas les groupes : seuls ses membres manqueront côté backend
      await job?.waitUntilFinished(remaining).catch(() => null);
    }
  }

  /**
   * Synchronise tous les groupes à l'état TO_SYNC (appelé par syncAll une fois les identités synchronisées,
   * pour que les membres existent dans les backends avant leurs groupes)
   */
  public async syncAllGroups(options?: ExecuteJobOptions): Promise<any> {
    const groups = await this.groupsService.model
      .find({ state: IdentityState.TO_SYNC, type: { $ne: GroupType.SUPER } }, { _id: 1 })
      .lean()
      .exec();
    if (!groups.length) return {};

    return await this.syncGroups(
      groups.map((group) => `${group._id}`),
      options,
    );
  }

  public async syncGroups(payload: string[], options?: ExecuteJobOptions): Promise<any> {
    if (!payload.length) throw new BadRequestException('No groups to sync');

    const groups: Groups[] = [];
    for (const key of payload) {
      const group = await this.groupsService.findById<Groups>(key);
      // un supergroupe n'existe pas dans les backends, seuls ses groupes rattachés sont synchronisés
      if (group.type === GroupType.SUPER) continue;
      groups.push(group);
    }
    if (!groups.length) return {};

    // un groupe n'est synchronisé que si tous ses membres (hors identités supprimées) le sont déjà dans les backends ;
    // sinon il reste à TO_SYNC et sera repris par une prochaine synchronisation
    const unsyncedMembers = new Set(
      (
        await this.identitiesService.model
          .find(
            {
              _id: { $in: groups.flatMap((group) => group.member || []) },
              deletedFlag: { $ne: true },
              // les identités DONT_SYNC ne sont pas envoyées comme membres, elles ne bloquent pas le groupe
              state: { $nin: [IdentityState.SYNCED, IdentityState.DONT_SYNC] },
            },
            { _id: 1 },
          )
          .lean()
          .exec()
      ).map((identity) => `${identity._id}`),
    );

    const result = {};
    const ready: Groups[] = [];
    for (const group of groups) {
      const pending = (group.member || []).filter((id) => unsyncedMembers.has(`${id}`)).length;
      if (!pending) {
        ready.push(group);
        continue;
      }
      this.logger.warn(`Group ${group.cn} not synced: ${pending} member(s) not synced yet`);
      result[`${group._id}`] = { error: `${pending} membre(s) non synchronisé(s), groupe en attente` };
    }
    if (!ready.length) return result;

    const task: Document<Tasks> = await this.tasksService.create<Tasks>({
      jobs: ready.map((group) => group._id),
    });

    for (const group of ready) {
      const action = group.lastBackendSync ? ActionType.GROUP_UPDATE : ActionType.GROUP_CREATE;
      try {
        const [executedJob] = await this.executeJob(action, group._id, await this.buildGroupPayload(group), {
          ...options,
          updateStatus: true,
          concernedToRef: 'groups',
          concernedToName: group.cn,
          task: task._id as unknown as Types.ObjectId,
        });
        result[`${group._id}`] = executedJob;
      } catch (error) {
        this.logger.error(`Unable to sync group ${group._id}: ${error?.message}`, error?.stack);
        result[`${group._id}`] = { error: error?.message ?? 'Unknown error' };
      }
    }
    return result;
  }

  public async deleteGroups(payload: string[], options?: ExecuteJobOptions): Promise<any> {
    if (!payload.length) throw new BadRequestException('No groups to delete');

    const result = {};
    for (const key of payload) {
      let group: Groups;
      try {
        group = await this.groupsService.findById<Groups>(key);
      } catch (error) {
        // un groupe introuvable ne doit pas interrompre la suppression des autres (suppression en masse)
        result[key] = { error: error?.message ?? 'Group not found' };
        continue;
      }
      if (group.type === GroupType.SUPER) {
        // les groupes rattachés sont supprimés avec leur supergroupe, qui n'existe que localement
        const childIds = await this.groupsService.findChildrenIds(group._id);
        if (childIds.length) Object.assign(result, await this.deleteGroups(childIds, options));
        await this.groupsService.model.findByIdAndDelete(group._id);
        result[key] = { deleted: true };
        continue;
      }
      if (!group.lastBackendSync) {
        // le groupe n'a jamais été synchronisé, suppression locale uniquement
        await this.groupsService.model.findByIdAndDelete(group._id);
        result[key] = { deleted: true };
        continue;
      }
      try {
        const [executedJob] = await this.executeJob(
          ActionType.GROUP_DELETE,
          group._id,
          await this.buildGroupPayload(group),
          {
            ...options,
            updateStatus: true,
            concernedToRef: 'groups',
            concernedToName: group.cn,
          },
        );
        result[key] = executedJob;
      } catch (error) {
        this.logger.error(`Unable to delete group ${group._id}: ${error?.message}`, error?.stack);
        result[key] = { error: error?.message ?? 'Unknown error' };
      }
    }
    return result;
  }

  public async executeJob(
    actionType: ActionType,
    concernedTo?: Types.ObjectId,

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
        jobId: new Types.ObjectId().toHexString(),
        attempts: 1,
      },
      options?.async,
    );
    // console.log('job', job)
    const optionals = {};
    if (!options?.async) {
      optionals['processedAt'] = new Date();
      optionals['state'] = JobState.IN_PROGRESS;
    }
    //anonymisation payload sur reset et changement de mdp
    if (actionType === ActionType.IDENTITY_PASSWORD_RESET || actionType === ActionType.IDENTITY_PASSWORD_CHANGE) {
      payload['newPassword'] = '**********';
    }
    if (actionType === ActionType.IDENTITY_PASSWORD_CHANGE) {
      payload['oldPassword'] = '**********';
    }
    let jobStore: Document<Jobs> = null;
    const disableLogs = options?.disableLogs === true;
    const concernedToRef = options?.concernedToRef || 'identities';
    const isGroupJob = concernedToRef === 'groups';
    if (!disableLogs || !!concernedTo) {
      let concernedToName = options?.concernedToName;
      if (!concernedToName && !disableLogs && concernedTo && isGroupJob) {
        concernedToName = payload?.group?.cn;
      }
      if (!concernedToName && !disableLogs && concernedTo && !isGroupJob) {
        concernedToName =
          payload?.after?.inetOrgPerson?.cn ?? payload?.identity?.inetOrgPerson?.cn ?? payload?.inetOrgPerson?.cn;
      }
      if (!concernedToName && !disableLogs && concernedTo && !isGroupJob) {
        const identity = await this.identitiesService.model.findById(concernedTo).select('inetOrgPerson.cn').lean();
        concernedToName = identity?.inetOrgPerson?.cn;
      }
      jobStore = await this.jobsService.create<Jobs>({
        jobId: job.id,
        action: actionType,
        ...(disableLogs ? {} : { params: payload }),
        concernedTo: concernedTo
          ? {
              $ref: concernedToRef,
              id: concernedTo,
              name: concernedToName,
            }
          : null,
        comment: options?.comment,
        task: options?.task,
        state: JobState.CREATED,
        ...optionals,
      });
    }

    if (concernedTo && !!options?.switchToProcessing) {
      await this.setConcernedState(concernedToRef, concernedTo, IdentityState.PROCESSING);
    }

    if (!options?.async) {
      let error: Error;

      try {
        const response = await job.waitUntilFinished(options.syncTimeout || DEFAULT_SYNC_TIMEOUT);

        if ((response as WorkerResultInterface)?.status > 0) {
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

        if (concernedTo && !!options?.updateStatus && isGroupJob) {
          await this.applyGroupJobResult(concernedTo, actionType, true);
        } else if (concernedTo && !!options?.updateStatus) {
          await this.identitiesService.model.findByIdAndUpdate(concernedTo, {
            $set: {
              state: options?.targetState || IdentityState.SYNCED,
              deletedFlag: options?.dataState === DataStatusEnum.DELETED,
              lastBackendSync: new Date(),
            },
          });
        }

        return [jobStoreUpdated as unknown as Jobs, response];
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        const isDiscardedHealthCheck = options?.disableLogs && options?.timeoutDiscard && error.name === 'TimeoutError';

        if (isDiscardedHealthCheck) {
          const waitedMs = options.syncTimeout || DEFAULT_SYNC_TIMEOUT;
          this.logger.debug(`Job ${job.id} timed out after health-check wait (${waitedMs}ms, discarded)`);
          await job.discard();

          throw new RequestTimeoutException({
            status: HttpStatus.REQUEST_TIMEOUT,
            message:
              actionType === ActionType.DUMP_PACKAGE_CONFIG
                ? `Le daemon n'a pas répondu dans le délai imparti (${waitedMs} ms)`
                : `Sync job ${job.id} failed to finish in time`,
            error,
          });
        }

        this.logger.error(`Error while executing job ${job.id}`, error);
        console.error(error.stack);
      }

      const stateOfJob = await job.getState();

      let jobFailed: ModifyResult<Query<Jobs, Jobs>> = null;
      if (!options?.disableLogs) {
        jobFailed = await this.jobsService.update<Jobs>(jobStore._id, {
          $set: {
            state: JobState.FAILED,
            finishedAt: new Date(),
            result: { ...(error as any)?.response },
          },
        });
      }

      if (concernedTo && !!options?.updateStatus) {
        await this.setConcernedState(concernedToRef, concernedTo, IdentityState.ON_ERROR);
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

      const workerResult = (error as any).response as WorkerResultInterface | undefined;

      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: formatWorkerResultErrorMessage(workerResult),
        error,
        job: workerResult,
      });
    }

    return [jobStore?.toObject() || null, null];
  }

  public async pingDaemon(): Promise<{ online: boolean; pingMs: number | null; error?: string; version?: string }> {
    const startedAt = Date.now();

    try {
      const [, response] = await this.executeJob(
        ActionType.DUMP_PACKAGE_CONFIG,
        undefined,
        {},
        {
          async: false,
          disableLogs: true,
          timeoutDiscard: true,
          syncTimeout: DAEMON_PING_TIMEOUT_MS,
        },
      );
      return {
        online: true,
        pingMs: Date.now() - startedAt,
        version: this._extractDaemonPackageVersion(response),
      };
    } catch (error) {
      const message = this._extractErrorMessage(error);
      this.logger.debug(`Daemon ping failed: ${message}`);
      return { online: false, pingMs: null, error: message };
    }
  }

  private _extractErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (response && typeof response === 'object' && 'message' in response) {
        const msg = (response as { message?: string | string[] }).message;
        if (Array.isArray(msg)) {
          return msg.join(', ');
        }
        if (typeof msg === 'string') {
          return msg;
        }
      }
    }
    return error instanceof Error ? error.message : String(error);
  }

  private _extractDaemonPackageVersion(response: unknown): string | undefined {
    const workerResult = response as WorkerResultInterface | undefined;
    const data = workerResult?.data as
      | Array<{ version?: string }>
      | { package?: { version?: string }; version?: string }
      | undefined;

    if (Array.isArray(data)) {
      return data[0]?.version;
    }

    return (
      data?.package?.version ||
      data?.version ||
      (response as { package?: { version?: string }; version?: string })?.package?.version ||
      (response as { version?: string })?.version
    );
  }
}
