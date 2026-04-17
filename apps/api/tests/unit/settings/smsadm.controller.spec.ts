import { SmsadmController } from '~/settings/smsadm.controller'

describe('SmsadmController', () => {
  const getParams = jest.fn()
  const setParams = jest.fn()
  const service = { getParams, setParams }

  const createRes = () => {
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    return { status, json }
  }

  let controller: SmsadmController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new SmsadmController(service as any)
  })

  it('should return sms params on get', async () => {
    getParams.mockResolvedValue({ host: 'smpp://localhost:2775' })
    const res = createRes()

    await controller.get(res as any)

    expect(getParams).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ data: { host: 'smpp://localhost:2775' } })
  })

  it('should persist sms params on set', async () => {
    const body = { host: 'smpp://sms.example.org:2775' }
    setParams.mockResolvedValue({ ok: 1 })
    const res = createRes()

    await controller.set(body as any, res as any)

    expect(setParams).toHaveBeenCalledWith(body)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ data: { ok: 1 } })
  })
})
