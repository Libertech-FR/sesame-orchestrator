import { ModuleRef } from '@nestjs/core';
import { Command, CommandRunner, InquirerService, Question, QuestionSet, SubCommand } from 'nest-commander';
import { KeyringsCreateDto } from '~/core/keyrings/_dto/keyrings.dto';
import { KeyringsService } from '~/core/keyrings/keyrings.service';

@QuestionSet({ name: 'keyrings-create-questions' })
export class KeyringsCreateQuestions {
  @Question({
    message: 'Name ?',
    name: 'name',
  })
  parseName(val: string) {
    return val;
  }
}

@SubCommand({ name: 'create' })
export class KeyringsCreateCommand extends CommandRunner {
  public constructor(
    protected moduleRef: ModuleRef,
    private readonly inquirer: InquirerService,
    private readonly keyringsService: KeyringsService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    const keyring = await this.inquirer.ask<KeyringsCreateDto>('keyrings-create-questions', undefined);
    try {
      const key = await this.keyringsService.create(keyring);
      console.log('Keyring created successfully', key.toJSON());
    } catch (error) {
      console.error('Error creating keyring', error);
    }
  }
}

@Command({ name: 'keyrings', arguments: '<task>', subCommands: [KeyringsCreateCommand] })
export class KeyringsCommand extends CommandRunner {
  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {}
}
