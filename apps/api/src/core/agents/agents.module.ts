import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsSchema, Agents } from '~/core/agents/_schemas/agents.schema';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { AgentCreateQuestions, AgentsCommand } from '~/core/agents/agents.command';
import { useOnCli } from '~/_common/functions/is-cli';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Agents.name,
        useFactory: () => AgentsSchema,
      },
    ]),
  ],
  providers: [
    AgentsService,
    ...useOnCli([
      ...AgentsCommand.registerWithSubCommands(),
      AgentCreateQuestions,
    ]),
  ],
  controllers: [AgentsController],
  exports: [AgentsService],
})
export class AgentsModule { }
