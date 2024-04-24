import { ModuleRef } from '@nestjs/core';
import { Command, CommandRunner, InquirerService, Question, QuestionSet, SubCommand } from 'nest-commander';
import { ApiSession } from '~/_common/data/api-session';
import { AuthService } from '~/core/auth/auth.service';
import { KeyringsCreateDto } from '~/core/keyrings/_dto/keyrings.dto';
import { Keyrings } from '~/core/keyrings/_schemas/keyrings.schema';
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
    private readonly authService: AuthService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    const keyring = await this.inquirer.ask<KeyringsCreateDto>('keyrings-create-questions', undefined);
    try {
      const key = (await this.keyringsService.create(keyring)) as Keyrings;
      console.log('Keyring created successfully', key.toJSON());
      const options = {
        scopes: ['api'],
      };
      if (key.suspendedAt) {
        options['expiresIn'] = key.suspendedAt.getTime() - Date.now();
      } else {
        options['expiresIn'] = '10y';
      }
      const { access_token } = await this.authService.createTokens(
        new ApiSession({
          _id: key._id.toString(),
          username: key.name,
          displayName: key.name,
          token: key.token,
        }),
        false,
        options,
      );
      console.log('Keyring created successfully', access_token);
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
