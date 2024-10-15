import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { readdir } from 'fs/promises'
import { Model } from 'mongoose'

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
    let files: string[] = []
    try {
      console.log('Loading migrations files')
      console.log(process.cwd())
      console.log(__dirname)
      console.log(__filename)
      files = await readdir('./migrations')
    } catch { }

    console.log(files)

    for (const file of files) {
      const migration = await import(`./migrations/${file}`)
      console.log(migration)
    }
  }
}
