import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { BullmqQueueAdapter } from './bullmq-queue.adapter';
import { SESAME_QUEUE } from './sesame-queue.constants';
import { SesameQueueAdapter } from '~/_common/interfaces/sesame-job.interface';

@Global()
@Module({})
export class SesameQueueModule {
  public static register(): DynamicModule {
    return {
      module: SesameQueueModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: SESAME_QUEUE,
          useFactory: (config: ConfigService, redis: Redis): SesameQueueAdapter =>
            new BullmqQueueAdapter(redis, config),
          inject: [ConfigService, getRedisConnectionToken()],
        },
      ],
      exports: [SESAME_QUEUE],
    };
  }
}
