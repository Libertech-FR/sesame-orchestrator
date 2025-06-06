import { Module } from '@nestjs/common';
import { AgentCreateQuestions, AgentsCommand } from './agents.command';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { RedisOptions } from 'ioredis';
import { RedisModule } from '@nestjs-modules/ioredis';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import config, { MongoosePlugin } from '~/config';
import { AgentsModule } from '~/core/agents/agents.module';
import { KeyringsCommand, KeyringsCreateQuestions } from './keyrings.command';
import { KeyringsModule } from '~/core/keyrings/keyrings.module';
import { BackendsCommand } from './backends.command';
import { BackendsModule } from '~/core/backends/backends.module';
import { AuthModule } from '~/core/auth/auth.module';
import { FactorydriveModule } from '@the-software-compagny/nestjs_module_factorydrive';
import { IdentitiesCommand } from './identities.command';
import { IdentitiesModule } from '~/management/identities/identities.module';

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
    AgentsModule,
    KeyringsModule,
    BackendsModule,
    IdentitiesModule,
    AuthModule,
  ],
  providers: [
    ...AgentsCommand.registerWithSubCommands(),
    ...KeyringsCommand.registerWithSubCommands(),
    ...BackendsCommand.registerWithSubCommands(),
    ...IdentitiesCommand.registerWithSubCommands(),
    AgentCreateQuestions,
    KeyringsCreateQuestions,
  ],
})
export class CliModule { }
