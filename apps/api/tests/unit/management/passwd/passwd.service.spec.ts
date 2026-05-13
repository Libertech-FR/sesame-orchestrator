jest.mock('@tacxou/nestjs_module_factorydrive', () => ({
  FactorydriveService: class FactorydriveService {},
}));

import { PasswdService } from '~/management/passwd/passwd.service';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';

describe('PasswdService invitations outdated', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('passes the expired invitation filter and pagination options to identities', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-13T08:00:00.000Z'));

    const findAndCount = jest.fn().mockResolvedValue([[], 0]);
    const ctx = {
      passwdadmService: {
        getPolicies: jest.fn().mockResolvedValue({ initTokenTTL: 3600 }),
      },
      identities: {
        findAndCount,
      },
      getInitOutdatedFilter: PasswdService.prototype.getInitOutdatedFilter,
    } as any;
    const options = { limit: 20, skip: 40, sort: { 'inetOrgPerson.cn': 1 } };

    await PasswdService.prototype.checkInitOutDated.call(ctx, options);

    expect(findAndCount).toHaveBeenCalledWith(
      {
        initState: InitStatesEnum.SENT,
        'initInfo.initDate': { $lt: new Date('2026-05-13T07:00:00.000Z') },
      },
      {
        state: 1,
        initState: 1,
        inetOrgPerson: 1,
        additionalFields: 1,
        metadata: 1,
        dataStatus: 1,
        lifecycle: 1,
        initInfo: 1,
      },
      options,
    );
  });
});
