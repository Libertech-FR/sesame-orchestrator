import { DynamicModule, Module } from '@nestjs/common';
import { ManagementService } from './management.service';
import { ManagementController } from './management.controller';
import { RouterModule } from '@nestjs/core';
import { PasswdModule } from './passwd/passwd.module';
import { IdentitiesModule } from './identities/identities.module';

@Module({
  imports: [PasswdModule, IdentitiesModule],
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
