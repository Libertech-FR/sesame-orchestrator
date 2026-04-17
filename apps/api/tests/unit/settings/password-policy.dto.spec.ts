import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { PasswordPoliciesDto } from '~/settings/_dto/password-policy.dto'

describe('PasswordPoliciesDto', () => {
  it('should accept valid reminder steps payload', async () => {
    const dto = plainToInstance(PasswordPoliciesDto, {
      passwordExpirationReminderSteps: [
        { daysBefore: 30, template: 'mail_reminder_30d', subject: 'J-30' },
        { daysBefore: 7, template: '', subject: '' },
      ],
    })

    const errors = await validate(dto)

    expect(errors).toHaveLength(0)
  })

  it('should reject invalid reminder steps payload type', async () => {
    const dto = plainToInstance(PasswordPoliciesDto, {
      passwordExpirationReminderSteps: 'invalid',
    })

    const errors = await validate(dto)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((error) => error.property === 'passwordExpirationReminderSteps')).toBe(true)
  })

  it('should reject invalid step daysBefore type', async () => {
    const dto = plainToInstance(PasswordPoliciesDto, {
      passwordExpirationReminderSteps: [
        { daysBefore: 'not-a-number', template: 'mail_reminder_30d', subject: 'J-30' },
      ],
    })

    const errors = await validate(dto)
    const stepError = errors.find((error) => error.property === 'passwordExpirationReminderSteps')

    expect(stepError).toBeDefined()
    expect(stepError?.children?.length).toBeGreaterThan(0)
  })
})
