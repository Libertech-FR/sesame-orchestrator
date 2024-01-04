import { Test, TestingModule } from '@nestjs/testing';
import { BackendsService } from './backends.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BackendsController } from './backends.controller';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisOptions } from 'ioredis';
import { BullModule } from '@nestjs/bullmq';

describe('BackendsService', () => {
  let service: BackendsService;

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

    service = module.get<BackendsService>(BackendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
