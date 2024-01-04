import { Test, TestingModule } from '@nestjs/testing';
import { BackendsController } from './backends.controller';
import { BackendsService } from './backends.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
import { RedisModule } from '@nestjs-modules/ioredis';

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
      ],
    }).compile();

    controller = module.get<BackendsController>(BackendsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
