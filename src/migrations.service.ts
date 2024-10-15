import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { readdir } from 'fs/promises'
import { Model } from 'mongoose'
import { glob } from 'glob'

@Injectable()
export class MigrationsService implements OnModuleInit {
  public constructor() { }

  public async onModuleInit() {
    await this.runMigrations()
  }

  public async runMigrations() {
    try {
      await this.loadMigrationsFiles()
    } catch { }
  }

  private async loadMigrationsFiles() {
    const files = await glob(`./migrations/*.js`, {
      cwd: __dirname,
      root: __dirname,
    })

    for (const file of files) {
      console.log('file', file)
      const migration = await import(`${__dirname}/${file}`)

      if (migration.default) {
        const instance = new migration.default()

        if (typeof instance.up === 'function') {
          await instance.up()
        }
      }
    }
  }
}
