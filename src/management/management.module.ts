import { DynamicModule, Module } from '@nestjs/common';
import { ManagementService } from './management.service';
import { ManagementController } from './management.controller';
import { RouterModule } from '@nestjs/core';
import { IdentitiesModule } from './identities/identities.module';
import { PasswdModule } from './passwd/passwd.module';
import { LifecycleModule } from './lifecycle/lifecycle.module';

@Module({
  imports: [IdentitiesModule, PasswdModule, LifecycleModule],
  providers: [ManagementService],
  controllers: [ManagementController],
})
export class ManagementModule {
  public static register(): DynamicModule {
    return {
      module: this,
      imports: [
        RouterModule.register([
          {
            path: 'management',
            children: [...Reflect.getMetadata('imports', this)],
          },
        ]),
      ],
    };
  }
}
