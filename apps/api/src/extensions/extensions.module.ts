import { DynamicModule, Logger, Module, OnModuleInit } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'
import { isConsoleEntrypoint } from '~/_common/functions/is-cli'
import serviceSetup from '~/extensions/extensions.service.setup'

@Module({
  imports: [],
})
export class ExtensionsModule implements OnModuleInit {
  public async onModuleInit(): Promise<void> {
    Logger.log('All extensions is initialized', 'ExtensionsModule')
  }

  public static async register(): Promise<DynamicModule> {
    if (isConsoleEntrypoint) {
      Logger.verbose('Console entrypoint detected, skipping extensions registration', 'ExtensionsModule')
      return {
        module: this,
        imports: [],
      }
    }

    Logger.debug('Registering extensions', 'ExtensionsModule')
    const modules = await serviceSetup()

    return {
      module: this,
      imports: [
        ...modules,
        RouterModule.register([
          {
            path: 'extensions',
            children: [...Reflect.getMetadata('imports', this)],
          },
        ]),
      ],
    }
  }
}
