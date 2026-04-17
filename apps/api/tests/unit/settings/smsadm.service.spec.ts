import { SmsadmService } from '~/settings/smsadm.service'
import { SmsSettingsDto } from '~/settings/_dto/sms.settings.dto'

describe('SmsadmService', () => {
  let service: SmsadmService

  beforeEach(() => {
    service = new SmsadmService({} as any)
  })

  it('should read sms params via getParameter(smsServer)', async () => {
    const expected = { host: 'smpp://localhost:2775' } as SmsSettingsDto
    const spy = jest.spyOn(service as any, 'getParameter').mockResolvedValue(expected)

    const result = await service.getParams()

    expect(spy).toHaveBeenCalledWith('smsServer')
    expect(result).toEqual(expected)
  })

  it('should store sms params via setParameter(smsServer)', async () => {
    const params = { host: 'smpp://sms.example.org:2775' } as SmsSettingsDto
    const spy = jest.spyOn(service as any, 'setParameter').mockResolvedValue({ ok: 1 })

    const result = await service.setParams(params)

    expect(spy).toHaveBeenCalledWith('smsServer', params)
    expect(result).toEqual({ ok: 1 })
  })
})
