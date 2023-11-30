import { Module } from '@nestjs/common';
import { PasswdModule } from './passwd/passwd.module';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [],
    }),
    PasswdModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async () => ({
        connection: {
          host: 'localhost',
        },
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}
