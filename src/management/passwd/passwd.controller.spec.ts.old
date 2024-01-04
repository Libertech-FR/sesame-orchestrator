import { Test, TestingModule } from '@nestjs/testing';
import { PasswdController } from './passwd.controller';
import { PasswdService } from './passwd.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisOptions } from 'ioredis';
import { BullModule } from '@nestjs/bullmq';

describe('PasswdController', () => {
  let controller: PasswdController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswdService],
      controllers: [PasswdController],
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

    controller = module.get<PasswdController>(PasswdController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
