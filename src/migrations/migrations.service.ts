import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { glob } from 'glob'
import chalk from 'chalk'
import { ModuleRef } from '@nestjs/core'
import { startLoader, stopLoader } from './migration-loader.function'
import { readFile, writeFile } from 'fs/promises'
import { posix } from 'path'
import { ConfigService } from '@nestjs/config'
import { Connection } from 'mongoose'
import { InjectConnection } from '@nestjs/mongoose'

@Injectable()
export class MigrationsService implements OnModuleInit {
  private readonly logger = new Logger(`${chalk.bold.red(MigrationsService.name)}\x1b[33m`)

  protected lockLocation: string
  protected migrations = new Map<string, any>()

  public constructor(
    @InjectConnection() private readonly mongo: Connection,
    private readonly moduleRef: ModuleRef,
    private readonly config: ConfigService,

  ) {
    this.lockLocation = posix.join(this.config.get('factorydrive.options.disks.local.config.root', '/tmp'), 'migrations.lock')
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
      const migration = await readFile(this.lockLocation, 'utf-8');
      currentTimestamp = parseInt(migration, 10);
      this.logger.log(chalk.blue(`Migration lock state is <${currentTimestamp}> !`));
    } catch (error) {
      this.logger.warn(chalk.red('No migration lock file found.'));
    }

    const dbMigration = await this.mongo.collection('migrations').findOne({}, { sort: { timestamp: -1 } });

    if (currentTimestamp === 0) {
      if (dbMigration) {
        try {
          this.logger.warn(chalk.yellow('No migration lock file found. Creating one with the last migration timestamp...'));
          await writeFile(this.lockLocation, dbMigration.timestamp.toString());
          this.logger.log(chalk.green('Migration lock file created.'));
        } catch (error) {
          this.logger.error(chalk.red('Error while creating migration lock file !'));
        }
      } else {
        try {
          await writeFile(this.lockLocation, currentTimestamp.toString());
          this.logger.log(chalk.green('Migration lock file created.'));
        } catch (error) {
          this.logger.error(chalk.red('Error while creating migration lock file !'));
        }
      }
    }

    if (!dbMigration && currentTimestamp !== 0) {
      this.logger.error(chalk.red('Database is not up to date with the migrations files !'));
      await this.mongo.collection('migrations').insertOne({
        timestamp: currentTimestamp,
        comment: 'Synchronization with the migration lock file',
      });
      this.logger.log(chalk.green('Database updated with the current migration lock file !'));
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

    if (!this.migrations.size) {
      this.logger.log(chalk.blue('No migrations to execute.'));
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
        await writeFile(this.lockLocation, migrationTimestamp);
        await this.mongo.collection('migrations').insertOne({
          timestamp: parseInt(migrationTimestamp),
          comment: `Migration ${key} executed`,
        })
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
