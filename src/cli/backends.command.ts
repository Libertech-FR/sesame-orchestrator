import { ModuleRef } from '@nestjs/core';
import { Command, CommandRunner, SubCommand } from 'nest-commander';
import { BackendsService } from '~/core/backends/backends.service';

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
    const result = await this.backendsService.syncAllIdentities({
      async: true,
    });
    for (const identity of Object.values(result)) {
      console.log(identity);
    }
  }
}

@Command({ name: 'backends', arguments: '<task>', subCommands: [BackendsSyncallCommand] })
export class BackendsCommand extends CommandRunner {
  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {}
}
