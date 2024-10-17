import { DynamicModule, Module } from '@nestjs/common';
import { MigrationsService } from './migrations.service';
import { RunMigrationService } from './run-migration.service';

@Module({
  providers: [
    MigrationsService,
    RunMigrationService,
  ],
})
export class MigrationsModule {
  public static async register(): Promise<DynamicModule> {
    return {
      module: this,
    }
  }
}
