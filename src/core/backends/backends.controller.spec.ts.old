import { Test, TestingModule } from '@nestjs/testing';
import { BackendsController } from './backends.controller';
import { BackendsService } from './backends.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
import { RedisModule } from '@nestjs-modules/ioredis';
import { BullModule } from '@nestjs/bullmq';

describe('BackendsController', () => {
  let controller: BackendsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackendsController],
      providers: [BackendsService],
      imports: [
        ConfigModule,
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
      ],
    }).compile();

    controller = module.get<BackendsController>(BackendsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
