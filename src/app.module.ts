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
<<<<<<< HEAD
<<<<<<< HEAD
import { SettingsModule } from '~/settings/settings.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MjmlAdapter } from '@nestjs-modules/mailer/dist/adapters/mjml.adapter';
import { MailadmService } from '~/settings/mailadm.service';
import { SettingsService } from '~/settings/settings.service';
<<<<<<< HEAD
=======
import { SettingstModule } from "~/settings/settings.module";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
<<<<<<< HEAD
>>>>>>> e7a3ec2 (chore: Remove unused MjmlAdapter import in app.module.ts)
=======
=======
import { SettingstModule } from '~/settings/settings.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
>>>>>>> 0cb4493 (chore: Update filestorage configuration for identities module)
import { FactorydriveModule } from '@the-software-compagny/nestjs_module_factorydrive';
>>>>>>> 84c012f (chore: Add @the-software-compagny/nestjs_module_factorydrive and @the-software-compagny/nestjs_module_factorydrive-s3 dependencies)
=======
import { FactorydriveModule } from '@the-software-compagny/nestjs_module_factorydrive';
>>>>>>> 0e4700b (chore: Update filestorage configuration for identities module)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    MailerModule.forRootAsync({
      imports: [SettingsModule],
      inject: [MailadmService],
      useFactory: async (service: MailadmService) => {
        const params = await service.getParams();
        return {
          transport: params.host,
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
      }),
    }),
    FactorydriveModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        ...config.get('factorydrive.options'),
      }),
    }),
    RequestContextModule,
    CoreModule.register(),
    ManagementModule.register(),
<<<<<<< HEAD
    SettingsModule.register(),
=======
    SettingstModule.register(),
>>>>>>> 0cb4493 (chore: Update filestorage configuration for identities module)
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
export class AppModule {}
