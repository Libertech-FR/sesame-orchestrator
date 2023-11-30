import { Test, TestingModule } from '@nestjs/testing';
import { BackendsService } from './backends.service';

describe('BackendsService', () => {
  let service: BackendsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BackendsService],
    }).compile();

    service = module.get<BackendsService>(BackendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
