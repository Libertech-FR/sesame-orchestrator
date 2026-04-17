import { MailadmController } from '~/settings/mailadm.controller'

describe('MailadmController', () => {
  const getParams = jest.fn()
  const setParams = jest.fn()
  const service = { getParams, setParams }

  const createRes = () => {
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    return { status, json }
  }

  let controller: MailadmController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new MailadmController(service as any)
  })

  it('should return smtp params on get', async () => {
    getParams.mockResolvedValue({ host: 'smtp://localhost:25' })
    const res = createRes()

    await controller.get(res as any)

    expect(getParams).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ data: { host: 'smtp://localhost:25' } })
  })

  it('should persist smtp params on set', async () => {
    const body = { host: 'smtp://mail.example.org:587' }
    setParams.mockResolvedValue({ ok: 1 })
    const res = createRes()

    await controller.set(body as any, res as any)

    expect(setParams).toHaveBeenCalledWith(body)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ data: { ok: 1 } })
  })
})
