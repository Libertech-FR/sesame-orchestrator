import { Test, TestingModule } from '@nestjs/testing';
import { BackendsService } from './backends.service';
import { ConfigModule } from '@nestjs/config';
import { BackendsController } from './backends.controller';

describe('BackendsService', () => {
  let service: BackendsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackendsController],
      providers: [BackendsService],
      imports: [ConfigModule],
    }).compile();

    service = module.get<BackendsService>(BackendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
