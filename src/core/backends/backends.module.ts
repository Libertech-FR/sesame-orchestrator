import { Module } from '@nestjs/common';
import { BackendsService } from './backends.service';
import { BackendsController } from './backends.controller';
import { ConfigModule } from '@nestjs/config';
import { IdentitiesModule } from '~/management/identities/identities.module';
import { JobsModule } from '../jobs/jobs.module';
import { TasksModule } from '../tasks/tasks.module';
@Module({
  imports: [ConfigModule, IdentitiesModule, JobsModule, TasksModule],
  controllers: [BackendsController],
  providers: [BackendsService],
  exports: [BackendsService],
})
export class BackendsModule {}
