import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { ManagementModule } from './management/management.module';
import config, { MongoosePlugin } from './config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisOptions } from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestContextModule } from 'nestjs-request-context';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { AuthGuard } from './_common/guards/auth.guard';
import { MongooseValidationFilter } from './_common/filters/mongoose-validation.filter';
import { DtoValidationPipe } from './_common/pipes/dto-validation.pipe';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        for (const plugin of config.get<MongoosePlugin[]>('mongoose.plugins')) {
          import(plugin.package).then((plugin) => {
            mongoose.plugin(plugin.default ? plugin.default : plugin, plugin.options);
          });
        }
        return {
          ...config.get<MongooseModuleOptions>('mongoose.options'),
          uri: config.get<string>('mongoose.uri'),
        };
      },
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        config: {
          ...config.get<RedisOptions>('ioredis.options'),
          url: config.get<string>('ioredis.uri'),
        },
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('ioredis.host'),
          port: configService.get('ioredis.port'),
        },
      }),
    }),
    RequestContextModule,
    CoreModule.register(),
    ManagementModule.register(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // {
    //   provide: APP_FILTER,
    //   useClass: AllExceptionFilter,
    // },
    {
      provide: APP_FILTER,
      useClass: MongooseValidationFilter,
    },
    {
      provide: APP_PIPE,
      useClass: DtoValidationPipe,
    },
  ],
})
export class AppModule {}
