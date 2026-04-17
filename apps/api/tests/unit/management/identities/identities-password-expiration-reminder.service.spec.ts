import { IdentitiesPasswordExpirationReminderService } from '~/management/identities/identities-password-expiration-reminder.service'
import { isConsoleEntrypoint } from '~/_common/functions/is-cli'

jest.mock('~/management/identities/identities-crud.service', () => ({
  IdentitiesCrudService: class IdentitiesCrudServiceMock {},
}))

jest.mock('~/_common/functions/is-cli', () => ({
  isConsoleEntrypoint: jest.fn(),
}))

describe('IdentitiesPasswordExpirationReminderService', () => {
  const mockedIsConsoleEntrypoint = isConsoleEntrypoint as jest.MockedFunction<typeof isConsoleEntrypoint>

  const aggregate = jest.fn()
  const updateOne = jest.fn()
  const find = jest.fn()
  const sendMail = jest.fn()
  const getPolicies = jest.fn()

  const passwordHistory = {
    model: {
      aggregate,
      updateOne,
    },
  }

  const identities = {
    model: {
      find,
    },
  }

  const mailer = {
    sendMail,
  }

  const passwdadmService = {
    getPolicies,
  }

  let service: IdentitiesPasswordExpirationReminderService

  beforeEach(() => {
    jest.clearAllMocks()
    mockedIsConsoleEntrypoint.mockReturnValue(false)

    service = new IdentitiesPasswordExpirationReminderService(
      passwordHistory as any,
      identities as any,
      passwdadmService as any,
      mailer as any,
    )
  })

  it('should skip execution in console entrypoint', async () => {
    mockedIsConsoleEntrypoint.mockReturnValue(true)

    await service.sendUpcomingPasswordExpirationReminders()

    expect(getPolicies).not.toHaveBeenCalled()
    expect(aggregate).not.toHaveBeenCalled()
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('should skip when no valid offsets are configured', async () => {
    getPolicies.mockResolvedValue({
      emailAttribute: 'inetOrgPerson.mail',
      passwordExpirationReminderSteps: [],
    })

    await service.sendUpcomingPasswordExpirationReminders()

    expect(aggregate).not.toHaveBeenCalled()
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('should send reminders for configured steps and mark sent day', async () => {
    getPolicies.mockResolvedValue({
      emailAttribute: 'inetOrgPerson.mail',
      passwordExpirationReminderSubject: 'Sujet fallback',
      passwordExpirationReminderSteps: [
        { daysBefore: 7, template: 'mail_custom_7d', subject: 'Sujet J-7' },
      ],
    })

    aggregate.mockResolvedValue([
      {
        _id: 'history-1',
        identityId: 'identity-1',
        expiresAt: new Date('2030-01-01T10:00:00.000Z'),
      },
    ])

    find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'identity-1',
          inetOrgPerson: {
            uid: 'john',
            displayName: 'John Doe',
            mail: 'john@example.org',
          },
        },
      ]),
    })

    sendMail.mockResolvedValue(undefined)
    updateOne.mockResolvedValue(undefined)

    await service.sendUpcomingPasswordExpirationReminders()

    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'john@example.org',
        subject: 'Sujet J-7',
        template: 'mail_custom_7d',
      }),
    )
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'history-1' },
      expect.objectContaining({
        $addToSet: { passwordExpiryReminderSentDays: 7 },
      }),
    )
  })

  it('should use default template and subject fallback when step values are empty', async () => {
    getPolicies.mockResolvedValue({
      emailAttribute: 'inetOrgPerson.mail',
      passwordExpirationReminderSubject: 'Sujet par défaut',
      passwordExpirationReminderSteps: [
        { daysBefore: 1, template: '', subject: '' },
      ],
    })

    aggregate.mockResolvedValue([
      {
        _id: 'history-2',
        identityId: 'identity-2',
        expiresAt: new Date('2030-01-02T10:00:00.000Z'),
      },
    ])

    find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'identity-2',
          inetOrgPerson: {
            mail: 'jane@example.org',
          },
        },
      ]),
    })

    sendMail.mockResolvedValue(undefined)
    updateOne.mockResolvedValue(undefined)

    await service.sendUpcomingPasswordExpirationReminders()

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.org',
        template: 'password_reminder',
        subject: 'Sujet par défaut',
      }),
    )
  })
})
