import { Test, TestingModule } from '@nestjs/testing';
import { PasswdService } from './passwd.service';
import { ConfigModule } from '@nestjs/config';
import { PasswdController } from './passwd.controller';

describe('PasswdService', () => {
  let service: PasswdService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswdService],
      controllers: [PasswdController],
      imports: [ConfigModule],
    }).compile();

    service = module.get<PasswdService>(PasswdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
