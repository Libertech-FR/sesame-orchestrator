import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PasswdModule } from './passwd/passwd.module';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import {ConfigModule, ConfigService} from '@nestjs/config';
import { BackendsModule } from './backends/backends.module';

import config from './config'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config]
    }),
    PasswdModule,
    AuthModule,
    BackendsModule]
})
export class AppModule {}
