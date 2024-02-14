import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsSchema, Agents } from '~/core/agents/_schemas/agents.schema';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Agents.name,
        useFactory: () => AgentsSchema,
      },
    ]),
  ],
  providers: [AgentsService],
  controllers: [AgentsController],
  exports: [AgentsService],
})
export class AgentsModule {}
