jest.mock('@tacxou/nestjs_module_factorydrive', () => ({
  FactorydriveService: class FactorydriveService {},
}));

import { HttpStatus } from '@nestjs/common';
import { IdentitiesCrudController } from '~/management/identities/identities-crud.controller';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';

describe('IdentitiesCrudController invitation expiration filter', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('excludes expired invitations when initInvitationExpired=false', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-13T08:00:00.000Z'));

    const service = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const passwdadmService = {
      getPolicies: jest.fn().mockResolvedValue({ initTokenTTL: 3600 }),
    };
    const controller = new IdentitiesCrudController(
      service as any,
      {} as any,
      {} as any,
      {} as any,
      passwdadmService as any,
    );
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const options = { limit: 10, skip: 0, sort: {} };

    await controller.search(res as any, '', { initState: InitStatesEnum.SENT } as any, options, 'false');

    expect(service.findAndCount).toHaveBeenCalledWith(
      {
        $and: [
          { initState: InitStatesEnum.SENT, state: { $ne: -99 } },
          {
            initState: InitStatesEnum.SENT,
            $or: [
              { 'initInfo.initDate': { $gte: new Date('2026-05-13T07:00:00.000Z') } },
              { 'initInfo.initDate': { $exists: false } },
              { 'initInfo.initDate': null },
            ],
          },
        ],
      },
      expect.any(Object),
      options,
    );
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.OK,
      total: 0,
      data: [],
    });
  });
});
