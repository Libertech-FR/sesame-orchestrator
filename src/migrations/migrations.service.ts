import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { glob } from 'glob'
import chalk from 'chalk'
import { ModuleRef } from '@nestjs/core'
import { startLoader, stopLoader } from './migration-loader.function'
import { readFile, writeFile } from 'fs/promises'
import { posix } from 'path'

@Injectable()
export class MigrationsService implements OnModuleInit {
  private readonly logger = new Logger(`${chalk.bold.red(MigrationsService.name)}\x1b[33m`)

  protected migrations = new Map<string, any>()

  protected lockLocation = posix.join(process.cwd(), 'migrations.lock')

  public constructor(private readonly moduleRef: ModuleRef) {
  }

  public async onModuleInit() {
    this.logger.debug(chalk.yellow('Migrations service initialized.'));
    this.logger.debug(chalk.yellow('Lock file location: ' + this.lockLocation));
    const currentTimestamp = await this._checkMigrationLockFile()
    this.logger.debug(chalk.yellow('Checking migrations files...'));
    await this._loadMigrationsFiles(currentTimestamp);

    const loader = startLoader('Migration en cours...');
    await this._executeMigrations();
    stopLoader(loader);
  }

  private async _checkMigrationLockFile() {
    let currentTimestamp = 0

    try {
      const migration = await readFile(this.lockLocation, 'utf-8')
      currentTimestamp = parseInt(migration, 10)
      this.logger.log(chalk.blue(`Migration lock state is <${currentTimestamp}> !`));
    } catch (error) {
      this.logger.warn(chalk.red('No migration lock file found.'))
    }

    if (currentTimestamp === 0) {
      try {
        await writeFile(this.lockLocation, currentTimestamp.toString())
        this.logger.log(chalk.green('Migration lock file created.'))
      } catch (error) {
        this.logger.error(chalk.red('Error while creating migration lock file !'))
      }
    }

    return currentTimestamp
  }

  private async _loadMigrationsFiles(currentTimestamp = 0) {
    let files = await glob(`./jobs/*.js`, {
      cwd: __dirname,
      root: __dirname,
    });

    files = files.filter((file) => {
      const [timestampMatch] = file.match(/\d{10,}/) || []

      if (!timestampMatch) {
        this.logger.warn(chalk.yellow(`Migration ${chalk.bold('<' + file.replace(/.js$/, '') + '>')} does not have a timestamp in the filename !`));
        return;
      }

      if (parseInt(timestampMatch) <= currentTimestamp) {
        this.logger.debug(chalk.yellow(`Migration ${chalk.bold('<' + file.replace(/.js$/, '') + '>')} are already executed !`));
        return false;
      }

      return true
    })

    files = files.sort((a, b) => {
      const [aTimestamp] = a.match(/\d{10,}/) || []
      const [bTimestamp] = b.match(/\d{10,}/) || []

      return parseInt(aTimestamp) - parseInt(bTimestamp)
    })

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
    if (this.migrations.size === 0) {
      this.logger.log(chalk.green('No migrations to execute.'));
      return;
    }

    for (const key of this.migrations.keys()) {
      const [migrationTimestamp] = key.match(/\d{10,}/) || []

      const migration = this.migrations.get(key);
      const instance = await this.moduleRef.create(migration.default);

      if (typeof instance.up !== 'function') {
        this.logger.log(chalk.yellow(`Migration ${chalk.bold('<' + key + '>')} does not have an up method !`));
        break;
      }

      try {
        this.logger.log(chalk.yellow(`Running migration ${chalk.bold('<' + key + '>')}...`));
        await instance.up();
      } catch (e) {
        this.logger.error(chalk.red(`Error while running migration ${chalk.bold('<' + key + '>')} !`));
        this.logger.error(e);
        break;
      }

      try {
        await writeFile('./migrations.lock', migrationTimestamp);
        this.logger.log(chalk.blue(`Migration ${chalk.bold('<' + key + '>')} done.`));
      } catch (e) {
        this.logger.error(chalk.red(`Error while updating migration lock file !`));
        this.logger.error(e);
        break
      }
    }

    this.logger.log(chalk.blue('All migrations done.'));
  }

  private async _validateMigration(migration: any) {
    if (!migration.default) {
      this.logger.log(chalk.yellow(`Migration ${chalk.bold('<' + migration + '>')} does not have a default export !`));
      return false;
    }

    return true;
  }
}
