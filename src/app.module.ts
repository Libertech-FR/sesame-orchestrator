import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PasswdModule } from './passwd/passwd.module';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PasswdModule,
    BullModule.forRoot({connection: {host:'redis',port:6379}}),
    AuthModule]
})
export class AppModule {}
