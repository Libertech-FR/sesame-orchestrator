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
    AgentsModule,
    KeyringsModule,
  ],
  providers: [
    ...AgentsCommand.registerWithSubCommands(),
    ...KeyringsCommand.registerWithSubCommands(),
    AgentCreateQuestions,
    KeyringsCreateQuestions,
  ],
})
export class CliModule {}
