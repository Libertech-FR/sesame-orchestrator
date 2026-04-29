import { IdentitiesPasswordExpirationReminderService } from '~/management/identities/identities-password-expiration-reminder.service';
import { isConsoleEntrypoint } from '~/_common/functions/is-cli';

jest.mock('~/management/identities/identities-crud.service', () => ({
  IdentitiesCrudService: class IdentitiesCrudServiceMock {},
}));

jest.mock('~/_common/functions/is-cli', () => ({
  isConsoleEntrypoint: jest.fn(),
}));

describe('IdentitiesPasswordExpirationReminderService', () => {
  const mockedIsConsoleEntrypoint = isConsoleEntrypoint as jest.MockedFunction<typeof isConsoleEntrypoint>;

  const aggregate = jest.fn();
  const updateOne = jest.fn();
  const find = jest.fn();
  const sendMail = jest.fn();
  const getPolicies = jest.fn();

  const identities = {
    model: {
      aggregate,
      find,
      updateOne,
    },
  };

  const mailer = {
    sendMail,
  };

  const passwdadmService = {
    getPolicies,
  };

  let service: IdentitiesPasswordExpirationReminderService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsConsoleEntrypoint.mockReturnValue(false);

    service = new IdentitiesPasswordExpirationReminderService(
      identities as any,
      passwdadmService as any,
      mailer as any,
    );
  });

  it('should skip execution in console entrypoint', async () => {
    mockedIsConsoleEntrypoint.mockReturnValue(true);

    await service.sendUpcomingPasswordExpirationReminders();

    expect(getPolicies).not.toHaveBeenCalled();
    expect(aggregate).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('should skip when no valid offsets are configured', async () => {
    getPolicies.mockResolvedValue({
      emailAttribute: 'inetOrgPerson.mail',
      passwordUsageReminderSteps: [],
    });

    await service.sendUpcomingPasswordExpirationReminders();

    expect(aggregate).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('should send reminders for configured steps and mark sent day', async () => {
    getPolicies.mockResolvedValue({
      emailAttribute: 'inetOrgPerson.mail',
      passwordUsageReminderSubject: 'Sujet fallback',
      passwordUsageReminderSteps: [{ daysBefore: 7, template: 'mail_custom_7d', subject: 'Sujet J-7' }],
    });

    aggregate.mockResolvedValue([
      {
        _id: 'history-1',
        expiresAt: new Date('2030-01-01T10:00:00.000Z'),
      },
    ]);

    find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'history-1',
          inetOrgPerson: {
            uid: 'john',
            displayName: 'John Doe',
            mail: 'john@example.org',
          },
        },
      ]),
    });

    sendMail.mockResolvedValue(undefined);
    updateOne.mockResolvedValue(undefined);

    await service.sendUpcomingPasswordExpirationReminders();

    expect(aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({
            state: expect.any(Number),
            passwordUsageExpiresAt: expect.any(Object),
            passwordUsageReminderSentDays: { $nin: [7] },
          }),
        }),
      ]),
    );
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'john@example.org',
        subject: 'Sujet J-7',
        template: 'mail_custom_7d',
      }),
    );
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'history-1' },
      expect.objectContaining({
        $addToSet: { passwordUsageReminderSentDays: 7 },
      }),
    );
  });

  it('should fallback to legacy reminder settings when usage settings are missing', async () => {
    getPolicies.mockResolvedValue({
      emailAttribute: 'inetOrgPerson.mail',
      passwordExpirationReminderSubject: 'Sujet legacy',
      passwordExpirationReminderSteps: [{ daysBefore: 3, template: 'mail_legacy_3d', subject: 'Legacy J-3' }],
    });

    aggregate.mockResolvedValue([
      {
        _id: 'history-legacy',
        expiresAt: new Date('2030-01-03T10:00:00.000Z'),
      },
    ]);

    find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'history-legacy',
          inetOrgPerson: {
            mail: 'legacy@example.org',
          },
        },
      ]),
    });

    sendMail.mockResolvedValue(undefined);
    updateOne.mockResolvedValue(undefined);

    await service.sendUpcomingPasswordExpirationReminders();

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'legacy@example.org',
        template: 'mail_legacy_3d',
        subject: 'Legacy J-3',
      }),
    );
  });

  it('should use default template and subject fallback when step values are empty', async () => {
    getPolicies.mockResolvedValue({
      emailAttribute: 'inetOrgPerson.mail',
      passwordUsageReminderSubject: 'Sujet par défaut',
      passwordUsageReminderSteps: [{ daysBefore: 1, template: '', subject: '' }],
    });

    aggregate.mockResolvedValue([
      {
        _id: 'history-2',
        expiresAt: new Date('2030-01-02T10:00:00.000Z'),
      },
    ]);

    find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'history-2',
          inetOrgPerson: {
            mail: 'jane@example.org',
          },
        },
      ]),
    });

    sendMail.mockResolvedValue(undefined);
    updateOne.mockResolvedValue(undefined);

    await service.sendUpcomingPasswordExpirationReminders();

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.org',
        template: 'password_reminder',
        subject: 'Sujet par défaut',
      }),
    );
  });
});
