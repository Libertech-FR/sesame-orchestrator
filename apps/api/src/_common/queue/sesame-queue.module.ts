import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { redisMicroserviceTransportOptions } from '~/_common/functions/redis-options-from-uri';
import { BullmqQueueAdapter } from './bullmq-queue.adapter';
import { MicroserviceQueueAdapter } from './microservice-queue.adapter';
import { SESAME_DAEMON_CLIENT, SESAME_QUEUE } from './sesame-queue.constants';
import { SesameQueueAdapter } from '~/_common/interfaces/sesame-job.interface';
import { ClientProxy } from '@nestjs/microservices';

@Global()
@Module({})
export class SesameQueueModule {
  public static register(): DynamicModule {
    const msBeta = process.env['SESAME_MS_BETA'] === '1';

    return {
      module: SesameQueueModule,
      imports: msBeta
        ? [
            ClientsModule.registerAsync([
              {
                name: SESAME_DAEMON_CLIENT,
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (config: ConfigService) => ({
                  transport: Transport.REDIS,
                  options: redisMicroserviceTransportOptions(config.get<string>('ioredis.uri')),
                }),
              },
            ]),
          ]
        : [],
      providers: [
        {
          provide: SESAME_QUEUE,
          useFactory: (config: ConfigService, redis: Redis, client?: ClientProxy): SesameQueueAdapter => {
            if (msBeta) {
              return new MicroserviceQueueAdapter(client, config);
            }
            return new BullmqQueueAdapter(redis, config);
          },
          inject: msBeta
            ? [ConfigService, getRedisConnectionToken(), SESAME_DAEMON_CLIENT]
            : [ConfigService, getRedisConnectionToken()],
        },
      ],
      exports: [SESAME_QUEUE],
    };
  }
}
