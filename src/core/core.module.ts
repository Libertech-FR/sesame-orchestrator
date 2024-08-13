import { DynamicModule, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AgentsModule } from './agents/agents.module';
import { AuthModule } from './auth/auth.module';
import { BackendsModule } from './backends/backends.module';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { JobsModule } from './jobs/jobs.module';
import { KeyringsModule } from './keyrings/keyrings.module';
import { LoggerModule } from './logger/logger.module';
import { TasksModule } from './tasks/tasks.module';
import { FilestorageModule } from './filestorage/filestorage.module';

@Module({
  imports: [
    AuthModule,
    BackendsModule,
    LoggerModule,
    KeyringsModule,
    AgentsModule,
    JobsModule,
    TasksModule,
    FilestorageModule,
  ],
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
