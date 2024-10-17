import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { glob } from 'glob'
import chalk from 'chalk'
import { ModuleRef } from '@nestjs/core'
import { startLoader, stopLoader } from './migration-loader.function'
import { readFile, writeFile } from 'fs/promises'

@Injectable()
export class MigrationsService implements OnModuleInit {
  private readonly logger = new Logger(`${chalk.bold.red(MigrationsService.name)}\x1b[33m`)

  protected migrations = new Map<string, any>()

  public constructor(private readonly moduleRef: ModuleRef) { }

  public async onModuleInit() {
    await this._checkMigrationLockFile()
    this.logger.log(chalk.yellow('Checking migrations files...'));
    await this._loadMigrationsFiles();

    const loader = startLoader('Migration en cours...');
    await this._executeMigrations();
    stopLoader(loader);
  }

  private async _checkMigrationLockFile() {
    let migrationTimestamp = 0

    try {
      const migration = await readFile('./migrations.lock', 'utf-8')
      console.log('migration', migration)
    } catch (error) {
      this.logger.warn(chalk.red('No migration lock file found.'))
    }

    if (migrationTimestamp === 0) {
      try {
        await writeFile('./migrations.lock', migrationTimestamp.toString())
        this.logger.log(chalk.green('Migration lock file created.'))
      } catch (error) {
        this.logger.error(chalk.red('Error while creating migration lock file !'))
      }
    }
  }

  private async _loadMigrationsFiles() {
    const currentTimestamp = 1729092659
    // const currentTimestamp = Date.now()
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

      if (parseInt(timestampMatch) < currentTimestamp) {
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
      const [timestampMatch] = file.match(/\d{10,}/) || []

      console.log('file', timestampMatch)

      if (!migration.default) {
        this.logger.log(chalk.yellow(`Migration ${chalk.bold('<' + file + '>')} does not have a default export !`));
        return;
      }

      this.migrations.set(timestampMatch, migration)
    }
  }

  private async _executeMigrations() {
    for (const key of this.migrations.keys()) {
      this.logger.log(chalk.yellow(`Running migration ${chalk.bold('<' + key + '>')}...`));

      const migration = this.migrations.get(key);
      const instance = await this.moduleRef.create(migration.default);

      if (typeof instance.up !== 'function') {
        this.logger.log(chalk.yellow(`Migration ${chalk.bold('<' + key + '>')} does not have an up method !`));
        break;
      }

      this.logger.log(chalk.yellow(`Running migration ${chalk.bold('<' + key + '>')}...`));
      await instance.up();
    }

    this.logger.log(chalk.green('All migrations done.'));
  }
}
