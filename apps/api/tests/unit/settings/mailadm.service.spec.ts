import { MailadmService } from '~/settings/mailadm.service'
import { MailSettingsDto } from '~/settings/_dto/mail.settings.dto'

describe('MailadmService', () => {
  let service: MailadmService

  beforeEach(() => {
    service = new MailadmService({} as any)
  })

  it('should read smtp params via getParameter(smtpServer)', async () => {
    const expected = { host: 'smtp://localhost:25' } as MailSettingsDto
    const spy = jest.spyOn(service as any, 'getParameter').mockResolvedValue(expected)

    const result = await service.getParams()

    expect(spy).toHaveBeenCalledWith('smtpServer')
    expect(result).toEqual(expected)
  })

  it('should store smtp params via setParameter(smtpServer)', async () => {
    const params = { host: 'smtp://mail.example.org:587' } as MailSettingsDto
    const spy = jest.spyOn(service as any, 'setParameter').mockResolvedValue({ ok: 1 })

    const result = await service.setParams(params)

    expect(spy).toHaveBeenCalledWith('smtpServer', params)
    expect(result).toEqual({ ok: 1 })
  })

  it('should expose MailSettingsDto defaults', async () => {
    const defaults = await (service as any).defaultValues()

    expect(defaults).toBeInstanceOf(MailSettingsDto)
    expect(defaults.host).toBe('smtp://localhost:25')
  })
})
