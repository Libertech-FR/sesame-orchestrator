import { Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { Command, CommandRunner, SubCommand } from 'nest-commander'
import { MigrationsService } from './migrations.service'

@SubCommand({ name: 'force' })
export class MigrationsForceCommand extends CommandRunner {
  private readonly logger = new Logger(MigrationsForceCommand.name)

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly migrationsService: MigrationsService,
  ) {
    super()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    const selector = inputs?.[0]
    if (!selector) {
      console.error('Usage: yarn run console migrations force <timestamp|filename>')
      return
    }

    this.logger.warn(`Forcing migration <${selector}> ...`)
    await this.migrationsService.forceRun(selector)
    this.logger.log('Done.')
  }
}

@Command({ name: 'migrations', arguments: '<task>', subCommands: [MigrationsForceCommand] })
export class MigrationsCommand extends CommandRunner {
  public constructor(protected moduleRef: ModuleRef) {
    super()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {}
}

