import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { glob } from 'glob'
import readline from 'readline'
import chalk from 'chalk'

function startLoader(message) {
  let currentFrame = 0;
  const spinnerFrames = ['-', '\\', '|', '/'];

  const loaderInterval = setInterval(() => {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`${spinnerFrames[currentFrame]} ${message} `);
    currentFrame = (currentFrame + 1) % spinnerFrames.length;
  }, 100);

  return loaderInterval;
}

function stopLoader(loaderInterval) {
  clearInterval(loaderInterval);
  readline.cursorTo(process.stdout, 0);
  process.stdout.clearLine(0);
}

@Injectable()
export class MigrationsService implements OnModuleInit {
  private readonly logger = new Logger(`${chalk.bold.red(MigrationsService.name)}\x1b[33m`)

  protected migrations = new Map<string, any>()

  public constructor() { }

  public async onModuleInit() {
    await this.runMigrations()
  }

  public async runMigrations() {
    this.logger.log(chalk.yellow('Checking migrations files...'));
    await this._loadMigrationsFiles()


    const loader = startLoader('Migration en cours...');
    await this._executeMigrations();
    stopLoader(loader);
  }

  private async _loadMigrationsFiles() {
    const files = await glob(`./migrations/*.js`, {
      cwd: __dirname,
      root: __dirname,
    });

    for (const file of files) {
      const migration = await import(`${__dirname}/${file}`);

      if (!migration.default) {
        this.logger.log(chalk.yellow(`Migration ${chalk.bold('<' + file + '>')} does not have a default export !`));
        return;
      }

      this.migrations.set(file, migration)
    }
  }

  private async _executeMigrations() {
    console.log('this.migrations.keys()', this.migrations.keys())
    for (const key of this.migrations.keys()) {
      const migration = this.migrations.get(key);
      const instance = new migration.default();

      if (typeof instance.up !== 'function') {
        this.logger.log(chalk.yellow(`Migration ${chalk.bold('<' + key + '>')} does not have an up method !`));
        break;
      }

      this.logger.log(chalk.yellow(`Running migration ${chalk.bold('<' + key + '>')}...`));
      await instance.up();
    }
  }
}
