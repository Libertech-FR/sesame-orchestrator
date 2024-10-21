import { DynamicModule, Module } from '@nestjs/common';
import { MigrationsService } from './migrations.service';

@Module({
  providers: [
    MigrationsService,
  ],
})
export class MigrationsModule {
  public static async register(): Promise<DynamicModule> {
    return {
      module: this,
    }
  }
}
