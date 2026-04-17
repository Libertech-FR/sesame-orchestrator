import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '~/app.controller';
import { AppService } from '~/app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getInfo: jest.fn().mockReturnValue({
              name: 'sesame-orchestrator',
              version: '0.0.0',
            }),
            getProjectUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });
});
