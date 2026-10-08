import { ModuleRef } from '@nestjs/core';
import { Command, CommandRunner, SubCommand } from 'nest-commander';
import { CronConsoleHandler } from '~/_common/decorators/cron-console-handler.decorator';
import { BackendsService } from '~/core/backends/backends.service';
import { GroupsService } from '~/management/groups/groups.service';

@CronConsoleHandler({
  handler: 'backends-syncall',
  command: 'backends syncall',
  label: 'Synchronisation de toutes les identités et de tous les groupes vers les backends',
})
@SubCommand({ name: 'syncall' })
export class BackendsSyncallCommand extends CommandRunner {
  public constructor(
    protected moduleRef: ModuleRef,
    private readonly backendsService: BackendsService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    // les identités d'abord : les groupes référencent leurs membres
    const result = {
      ...(await this.backendsService.syncAllIdentities({ async: true })),
      ...(await this.backendsService.syncAllGroups({ async: true })),
    };
    for (const identity of Object.values(result)) {
      console.log(identity);
    }
  }
}

@CronConsoleHandler({
  handler: 'groups-dynamic-refresh',
  command: 'backends refresh-dynamic-groups',
  label: 'Recalcul des membres des groupes dynamiques et synchronisation des groupes modifiés',
})
@SubCommand({ name: 'refresh-dynamic-groups' })
export class BackendsRefreshDynamicGroupsCommand extends CommandRunner {
  public constructor(
    protected moduleRef: ModuleRef,
    private readonly backendsService: BackendsService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    // GroupsService est résolu à la demande, comme dans BackendsService (dépendance circulaire entre modules)
    const groupsService = this.moduleRef.get(GroupsService, { strict: false });
    const changed = await groupsService.refreshDynamicGroups();
    console.log(`${changed.length} groupe(s) dynamique(s) modifié(s)`);
    if (!changed.length) return;

    const result = await this.backendsService.syncGroups(changed, { async: true });
    for (const group of Object.values(result || {})) {
      console.log(group);
    }
  }
}

@Command({
  name: 'backends',
  arguments: '<task>',
  subCommands: [BackendsSyncallCommand, BackendsRefreshDynamicGroupsCommand],
})
export class BackendsCommand extends CommandRunner {
  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {}
}
