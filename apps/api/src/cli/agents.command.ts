import { ModuleRef } from '@nestjs/core';
import { Command, CommandRunner, InquirerService, Question, QuestionSet, SubCommand } from 'nest-commander';
import { AgentsCreateDto } from '~/core/agents/_dto/agents.dto';
import { AgentsService } from '~/core/agents/agents.service';

@QuestionSet({ name: 'agent-create-questions' })
export class AgentCreateQuestions {
  @Question({
    message: 'Username ?',
    name: 'username',
  })
  parseUsername(val: string) {
    return val;
  }

  @Question({
    message: 'Email ?',
    name: 'email',
  })
  parseEmail(val: string) {
    return val;
  }

  @Question({
    message: 'Password ?',
    name: 'password',
    type: 'password',
  })
  parsePassword(val: string) {
    return val;
  }
}

@SubCommand({ name: 'create' })
export class AgentsCreateCommand extends CommandRunner {
  public constructor(
    protected moduleRef: ModuleRef,
    private readonly inquirer: InquirerService,
    private readonly agentsService: AgentsService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    const agent = await this.inquirer.ask<AgentsCreateDto>('agent-create-questions', undefined);
    try {
      await this.agentsService.create(agent);
      console.log('Agent created successfully');
    } catch (error) {
      console.error('Error creating agent', error);
    }
  }
}

@Command({ name: 'agents', arguments: '<task>', subCommands: [AgentsCreateCommand] })
export class AgentsCommand extends CommandRunner {
  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> { }
}
