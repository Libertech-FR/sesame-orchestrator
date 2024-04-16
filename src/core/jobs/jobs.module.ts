import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsSchema, Jobs } from './_schemas/jobs.schema';
import { JobsService } from './jobs.service';
import { TasksController } from './jobs.controller';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Jobs.name,
        useFactory: () => JobsSchema,
      },
    ]),
  ],
  providers: [JobsService],
  controllers: [TasksController],
  exports: [JobsService],
})
export class JobsModule {}
