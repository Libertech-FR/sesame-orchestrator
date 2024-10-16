import { DynamicModule, Logger, Module } from '@nestjs/common';
import { glob } from 'glob';
import chalk from 'chalk';
import { MigrationsService } from './migrations.service';

@Module({
  imports: [],
  providers: [
    MigrationsService,
  ],
})
export class MigrationsModule {
  public static async register(): Promise<DynamicModule> {
    const jobs = [];
    const files = await glob(`./jobs/*.js`, {
      cwd: __dirname,
      root: __dirname,
    });

    for (const file of files) {
      const migration = await import(`${__dirname}/${file}`);

      if (!migration.default) {
        Logger.log(chalk.yellow(`Migration ${chalk.bold('<' + file + '>')} does not have a default export !`));
        return;
      }

      jobs.push(migration.default);
    }

    return {
      module: this,
      providers: [
        ...Reflect.getMetadata('providers', this),
        ...jobs,
      ],
    }
  }
}
