import { Test, TestingModule } from '@nestjs/testing';
import { PasswdController } from './passwd.controller';
import { PasswdService } from './passwd.service';
import { ConfigModule } from '@nestjs/config';

describe('PasswdController', () => {
  let controller: PasswdController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswdService],
      controllers: [PasswdController],
      imports: [ConfigModule],
    }).compile();

    controller = module.get<PasswdController>(PasswdController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
