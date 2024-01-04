import { Test, TestingModule } from '@nestjs/testing';
import { PasswdService } from './passwd.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PasswdController } from './passwd.controller';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisOptions } from 'ioredis';

describe('PasswdService', () => {
  let service: PasswdService;

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
      ],
    }).compile();

    service = module.get<PasswdService>(PasswdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
