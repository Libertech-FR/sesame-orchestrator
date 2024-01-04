import { Test, TestingModule } from '@nestjs/testing';
import { BackendsController } from './backends.controller';
import { BackendsService } from './backends.service';
import { ConfigModule } from '@nestjs/config';

describe('BackendsController', () => {
  let controller: BackendsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackendsController],
      providers: [BackendsService],
      imports: [ConfigModule],
    }).compile();

    controller = module.get<BackendsController>(BackendsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
