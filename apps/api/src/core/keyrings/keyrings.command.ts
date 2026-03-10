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

  @Question({
    message: 'Roles (separés par une virgule, si vide: "admin") ?',
    name: 'roles',
  })
  parseRoles(val: string) {
    const roles = val?.split(',').map((role) => role.trim()).filter((role) => role !== '');

    if (roles.length === 0) {
      return ['admin'];
    }

    return roles;
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
      // console.log('Keyring created successfully', key.toJSON());
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
          roles: key.roles,
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

@SubCommand({ name: 'list' })
export class KeyringsListCommand extends CommandRunner {
  public constructor(
    protected moduleRef: ModuleRef,
    private readonly keyringsService: KeyringsService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    try {
      const keyrings = (await this.keyringsService.find<Keyrings>({})) as unknown as Keyrings[];
      console.table(
        keyrings.map((keyring) => ({
          name: keyring.name,
          suspendedAt: keyring.suspendedAt ?? null,
          allowedNetworks: keyring.allowedNetworks ?? [],
        })),
      );
    } catch (error) {
      console.error('Error listing keyrings', error);
    }
  }
}

@SubCommand({ name: 'delete' })
export class KeyringsDeleteCommand extends CommandRunner {
  public constructor(
    protected moduleRef: ModuleRef,
    private readonly keyringsService: KeyringsService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    const name = inputs[0];
    if (!name) {
      console.error('Missing keyring name. Usage: console keyrings delete <name>');
      return;
    }

    try {
      const keyring = (await this.keyringsService.findOne<Keyrings>({ name })) as unknown as Keyrings;
      await this.keyringsService.delete<Keyrings>(keyring._id);
      console.log(`Keyring "${name}" deleted successfully`);
    } catch (error) {
      console.error(`Error deleting keyring "${name}"`, error);
    }
  }
}

@Command({ name: 'keyrings', arguments: '<task>', subCommands: [KeyringsCreateCommand, KeyringsListCommand, KeyringsDeleteCommand] })
export class KeyringsCommand extends CommandRunner {
  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {}
}
