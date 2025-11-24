import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lifecycle, LifecycleSchema } from './_schemas/lifecycle.schema';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleService } from './lifecycle.service';
import { IdentitiesModule } from '../identities/identities.module';
import { useOnCli } from '~/_common/functions/is-cli';
import { LifecycleCommand } from './lifecycle.command';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Lifecycle.name,
        schema: LifecycleSchema,
      },
    ]),
    IdentitiesModule,
  ],
  providers: [
    LifecycleService,
    ...useOnCli([
      ...LifecycleCommand.registerWithSubCommands(),
    ]),
  ],
  controllers: [LifecycleController],
  exports: [LifecycleService],
})
export class LifecycleModule { }
