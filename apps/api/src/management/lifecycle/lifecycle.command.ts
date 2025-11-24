import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Command, CommandRunner, InquirerService, SubCommand } from 'nest-commander';
import { LifecycleService } from './lifecycle.service';

@SubCommand({ name: 'list' })
export class LifecycleListCommand extends CommandRunner {
  private readonly logger = new Logger(LifecycleListCommand.name);

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly inquirer: InquirerService,
    private readonly lifecycleService: LifecycleService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    this.logger.log('Starting lifecycle list command ...');

    const lifecycles = await this.lifecycleService.listLifecycleSources();

    Object.entries(lifecycles).forEach(([source, actions]) => {
      this.logger.log(`=== Lifecycle Source: ${source} ===`);
      if (actions && Array.isArray(actions) && actions.length > 0) {
        console.table(actions);
      } else {
        this.logger.warn('No lifecycle actions found.');
      }
    });
  }
}

@Command({ name: 'lifecycle', arguments: '<task>', subCommands: [LifecycleListCommand] })
export class LifecycleCommand extends CommandRunner {
  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> { }
}
