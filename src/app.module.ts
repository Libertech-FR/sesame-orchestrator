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
import { SettingsModule } from '~/settings/settings.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailadmService } from '~/settings/mailadm.service';
import { FactorydriveModule } from '~/_common/factorydrive';
import { MigrationsModule } from './migrations/migrations.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ShutdownObserver } from './_common/observers/shutdown.observer';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { ExtensionsModule } from './extensions/extensions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 25,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    MailerModule.forRootAsync({
      imports: [SettingsModule],
      inject: [MailadmService],
      useFactory: async (service: MailadmService) => {
        const params = await service.getParams();
        const regex = /^(smtps?|):\/\/([a-zA-Z0-9.-]+|\d{1,3}(?:\.\d{1,3}){3}|\[(?:[0-9a-fA-F:]+)\]):(\d+)$/;
        const [_, protocol, host, port] = `${params.host}`.match(regex);
        const isDev = process.env.NODE_ENV === 'development';

        return {
          transport: {
            host,
            port: parseInt(port),
            from: params.sender,
            secure: protocol === 'smtps' && port === '465',
            requireTLS: protocol === 'smtps' && port === '587',
            auth: {
              user: params.username,
              pass: params.password,
            },
            tls: {
              ciphers: 'SSLv3,TLSv1,TLSv1.1,TLSv1.2',
            },
            debug: isDev,
            logger: isDev,
          },
          defaults: {
            from: params.sender,
          },
          template: {
            dir: __dirname + '/../templates',
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
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
        type: 'single',
        url: config.get<string>('ioredis.uri'),
        options: config.get<RedisOptions>('ioredis.options'),
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
        blockingConnection: true,
      }),
    }),
    FactorydriveModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        ...config.get('factorydrive.options'),
      }),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        ...config.get('axios.options'),
      }),
    }),
    RequestContextModule,
    ScheduleModule.forRoot(),
    CoreModule.register(),
    ManagementModule.register(),
    SettingsModule.register(),
    MigrationsModule.register(),
    ExtensionsModule.register(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ShutdownObserver,
    {
      provide: APP_GUARD,
      useClass: AuthGuard('jwt'),
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
export class AppModule { }
