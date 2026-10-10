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
    // les groupes ne sont mis en file qu'une fois les jobs des identités terminés : le process doit rester actif jusque-là
    const result = await this.backendsService.syncAll({ async: true, waitForGroups: true });
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

@CronConsoleHandler({
  handler: 'supergroups-refresh',
  command: 'backends refresh-supergroups',
  label: 'Recalcul des groupes rattachés aux supergroupes et synchronisation des groupes modifiés',
})
@SubCommand({ name: 'refresh-supergroups' })
export class BackendsRefreshSupergroupsCommand extends CommandRunner {
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
    const { changed, removed } = await groupsService.refreshSupergroups();
    console.log(`${changed.length} groupe(s) créé(s) ou modifié(s), ${removed.length} groupe(s) à supprimer`);

    if (removed.length) {
      for (const group of Object.values((await this.backendsService.deleteGroups(removed, { async: true })) || {})) {
        console.log(group);
      }
    }
    if (changed.length) {
      for (const group of Object.values((await this.backendsService.syncGroups(changed, { async: true })) || {})) {
        console.log(group);
      }
    }
  }
}

@Command({
  name: 'backends',
  arguments: '<task>',
  subCommands: [BackendsSyncallCommand, BackendsRefreshDynamicGroupsCommand, BackendsRefreshSupergroupsCommand],
})
export class BackendsCommand extends CommandRunner {
  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {}
}
