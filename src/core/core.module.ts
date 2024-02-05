import { DynamicModule, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CoreService } from './core.service';
import { CoreController } from './core.controller';
import { BackendsModule } from './backends/backends.module';
import { LoggerModule } from './logger/logger.module';
import { KeyringsModule } from './keyrings/keyrings.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [AuthModule, BackendsModule, LoggerModule, KeyringsModule, AgentsModule],
  providers: [CoreService],
  controllers: [CoreController],
})
export class CoreModule {
  public static register(): DynamicModule {
    return {
      module: this,
      imports: [
        RouterModule.register([
          {
            path: 'core',
            children: [...Reflect.getMetadata('imports', this)],
          },
        ]),
      ],
    };
  }
}
