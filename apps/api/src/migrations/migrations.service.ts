import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { glob } from 'glob'
import chalk from 'chalk'
import { ModuleRef } from '@nestjs/core'
import { startLoader, stopLoader } from './migration-loader.function'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { posix, dirname } from 'path'
import { ConfigService } from '@nestjs/config'
import { Connection } from 'mongoose'
import { InjectConnection } from '@nestjs/mongoose'

/**
 * Service de gestion des migrations de base de données
 *
 * @class MigrationsService
 * @implements {OnModuleInit}
 * @description Ce service gère l'exécution automatique des migrations de base de données
 * au démarrage du module. Il maintient un fichier de verrouillage pour suivre l'état
 * des migrations et garantir qu'elles ne sont exécutées qu'une seule fois.
 *
 * Les migrations sont stockées dans le dossier `jobs/` avec un timestamp dans le nom du fichier.
 * Le service vérifie le fichier de verrouillage et la collection MongoDB pour déterminer
 * quelles migrations doivent être exécutées.
 */
@Injectable()
export class MigrationsService implements OnModuleInit {
  private readonly logger = new Logger(`${chalk.bold.red(MigrationsService.name)}\x1b[33m`)

  protected lockLocation: string
  protected migrations = new Map<string, any>()

  /**
   * Constructeur du service de migrations
   *
   * @param {Connection} mongo - Connexion MongoDB injectée
   * @param {ModuleRef} moduleRef - Référence au module NestJS pour créer des instances dynamiques
   * @param {ConfigService} config - Service de configuration pour récupérer les paramètres
   */
  public constructor(
    @InjectConnection() private readonly mongo: Connection,
    private readonly moduleRef: ModuleRef,
    private readonly config: ConfigService,
  ) {
    const storageRoot = this.config.get<string>('factorydrive.options.disks.local.config.root', '/tmp')
    this.lockLocation = posix.join(storageRoot, 'migrations.lock')
    this.logger.debug(`Migration lock file location: ${this.lockLocation}`)
    this.logger.debug(`Storage root: ${storageRoot}`)
    this.logger.debug(`Process CWD: ${process.cwd()}`)
  }

  /**
   * Hook d'initialisation du module
   *
   * @async
   * @description Appelé automatiquement au démarrage du module.
   * Initialise le service de migrations en:
   * 1. Vérifiant le fichier de verrouillage
   * 2. Chargeant les fichiers de migrations
   * 3. Exécutant les migrations nécessaires
   */
  public async onModuleInit(): Promise<void> {
    this.logger.debug(chalk.yellow('Migrations service initialized.'))
    this.logger.debug(chalk.yellow('Lock file location: ' + this.lockLocation))
    const currentTimestamp = await this._checkMigrationLockFile()
    this.logger.debug(chalk.yellow('Checking migrations files...'))
    await this._loadMigrationsFiles(currentTimestamp)

    const loader = startLoader('Migration en cours...')
    await this._executeMigrations()
    stopLoader(loader)
  }

  /**
   * Vérifie et synchronise le fichier de verrouillage des migrations
   *
   * @async
   * @private
   * @returns {Promise<number>} Le timestamp de la dernière migration exécutée
   * @description Vérifie l'existence et la cohérence du fichier de verrouillage.
   * Si le fichier n'existe pas, il est créé avec le timestamp de la dernière migration
   * dans la base de données. Synchronise également la base de données si nécessaire.
   */
  private async _checkMigrationLockFile(): Promise<number> {
    let currentTimestamp = 0

    try {
      const migration = await readFile(this.lockLocation, 'utf-8')
      currentTimestamp = parseInt(migration, 10)
      this.logger.log(chalk.blue(`Migration lock state is <${currentTimestamp}> !`))
    } catch (error) {
      this.logger.warn(chalk.red('No migration lock file found.'))
    }

    const dbMigration = await this.mongo.collection('migrations').findOne({}, { sort: { timestamp: -1 } })

    if (currentTimestamp === 0) {
      if (dbMigration) {
        try {
          this.logger.warn(chalk.yellow('No migration lock file found. Creating one with the last migration timestamp...'))
          const lockDir = dirname(this.lockLocation)
          await mkdir(lockDir, { recursive: true })
          await writeFile(this.lockLocation, dbMigration.timestamp.toString())
          this.logger.log(chalk.green('Migration lock file created.'))
        } catch (error) {
          this.logger.error(chalk.red('Error while creating migration lock file !'))
        }
      } else {
        try {
          const lockDir = dirname(this.lockLocation)
          await mkdir(lockDir, { recursive: true })
          await writeFile(this.lockLocation, currentTimestamp.toString())
          this.logger.log(chalk.green('Migration lock file created.'))
        } catch (error) {
          this.logger.error(chalk.red('Error while creating migration lock file !'))
        }
      }
    }

    if (!dbMigration && currentTimestamp !== 0) {
      this.logger.error(chalk.red('Database is not up to date with the migrations files !'))
      await this.mongo.collection('migrations').insertOne({
        timestamp: currentTimestamp,
        comment: 'Synchronization with the migration lock file',
      })
      this.logger.log(chalk.green('Database updated with the current migration lock file !'))
    }

    return currentTimestamp
  }

  /**
   * Charge les fichiers de migrations à exécuter
   *
   * @async
   * @private
   * @param {number} [currentTimestamp=0] - Timestamp de la dernière migration exécutée
   * @description Recherche et filtre les fichiers de migrations dans le dossier `jobs/`.
   * Ne charge que les migrations dont le timestamp est supérieur au timestamp actuel.
   * Les migrations sont triées par ordre chronologique avant d'être chargées.
   */
  private async _loadMigrationsFiles(currentTimestamp = 0): Promise<void> {
    let files = await glob(`./jobs/*.js`, {
      cwd: __dirname,
      root: __dirname,
    })

    files = files.filter((file) => {
      const [timestampMatch] = file.match(/\d{10,}/) || []

      if (!timestampMatch) {
        this.logger.warn(chalk.yellow(`Migration ${chalk.bold('<' + file.replace(/.js$/, '') + '>')} does not have a timestamp in the filename !`))
        return
      }

      if (parseInt(timestampMatch) <= currentTimestamp) {
        this.logger.debug(chalk.yellow(`Migration ${chalk.bold('<' + file.replace(/.js$/, '') + '>')} are already executed !`))
        return false
      }

      return true
    })

    files = files.sort((a, b) => {
      const [aTimestamp] = a.match(/\d{10,}/) || []
      const [bTimestamp] = b.match(/\d{10,}/) || []

      return parseInt(aTimestamp) - parseInt(bTimestamp)
    })

    for (const file of files) {
      const migration = await import(`${__dirname}/${file}`)

      if (!migration.default) {
        this.logger.log(chalk.yellow(`Migration ${chalk.bold('<' + file + '>')} does not have a default export !`))
        return
      }

      this.migrations.set(file, migration)
    }
  }

  /**
   * Exécute toutes les migrations en attente
   *
   * @async
   * @private
   * @description Parcourt et exécute séquentiellement toutes les migrations chargées.
   * Chaque migration doit avoir une méthode `up()` qui sera appelée.
   * En cas d'erreur, le processus s'arrête et l'erreur est loggée.
   * Après chaque migration réussie, le fichier de verrouillage est mis à jour.
   */
  private async _executeMigrations(): Promise<void> {
    if (this.migrations.size === 0) {
      this.logger.log(chalk.green('No migrations to execute.'))
      return;
    }

    if (!this.migrations.size) {
      this.logger.log(chalk.blue('No migrations to execute.'))
      return;
    }

    for (const key of this.migrations.keys()) {
      const [migrationTimestamp] = key.match(/\d{10,}/) || []

      const migration = this.migrations.get(key)
      const instance = await this.moduleRef.create(migration.default)

      if (typeof instance.up !== 'function') {
        this.logger.log(chalk.yellow(`Migration ${chalk.bold('<' + key + '>')} does not have an up method !`))
        break
      }

      try {
        this.logger.log(chalk.yellow(`Running migration ${chalk.bold('<' + key + '>')}...`))
        await instance.up()
      } catch (e) {
        this.logger.error(chalk.red(`Error while running migration ${chalk.bold('<' + key + '>')} !`))
        this.logger.error(e.message, e.stack)
        return
      }

      this._writeMigrationLockFile(key, migrationTimestamp)
    }

    this.logger.log(chalk.blue('All migrations done.'))
  }

  /**
   * Met à jour le fichier de verrouillage et la base de données après une migration
   *
   * @async
   * @private
   * @param {string} migrationKey - Nom du fichier de migration
   * @param {string} migrationTimestamp - Timestamp de la migration
   * @throws {Error} Si la mise à jour du fichier de verrouillage échoue
   * @description Écrit le nouveau timestamp dans le fichier de verrouillage
   * et insère un enregistrement dans la collection MongoDB `migrations`
   * pour garder une trace de l'exécution.
   */
  private async _writeMigrationLockFile(migrationKey: string, migrationTimestamp: string): Promise<void> {
    try {
      // Ensure the directory exists before writing the file
      const lockDir = dirname(this.lockLocation)
      this.logger.debug(`Creating directory: ${lockDir}`)
      await mkdir(lockDir, { recursive: true })

      this.logger.debug(`Writing migration lock file to: ${this.lockLocation}`)
      await writeFile(this.lockLocation, migrationTimestamp)
      await this.mongo.collection('migrations').insertOne({
        timestamp: parseInt(migrationTimestamp),
        comment: `Migration ${migrationKey} executed`,
      })
      this.logger.log(chalk.blue(`Migration ${chalk.bold('<' + migrationKey + '>')} done.`))
    } catch (e) {
      this.logger.error(chalk.red(`Error while updating migration lock file !`))
      this.logger.error(`Lock file path: ${this.lockLocation}`)
      this.logger.error(`Lock file directory: ${dirname(this.lockLocation)}`)
      this.logger.error(e)

      throw new Error('Error while updating migration lock file !')
    }
  }
}
