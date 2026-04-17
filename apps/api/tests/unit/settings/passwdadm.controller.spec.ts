import { BadRequestException } from '@nestjs/common'
import { PasswdadmController } from '~/settings/passwdadm.controller'

describe('PasswdadmController', () => {
  const setPolicies = jest.fn()
  const getPolicies = jest.fn()
  const configGet = jest.fn()

  const passwdadmService = {
    setPolicies,
    getPolicies,
  }

  const configService = {
    get: configGet,
  }

  const createRes = () => {
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    return { status, json }
  }

  let controller: PasswdadmController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new PasswdadmController(passwdadmService as any, configService as any)
  })

  it('should reject setPolicies when pwnedRecheckEnabled and HIBP key is missing', async () => {
    configGet.mockReturnValue('')

    await expect(
      controller.setPolicies(
        {
          pwnedRecheckEnabled: true,
        } as any,
        {} as any,
      ),
    ).rejects.toThrow(BadRequestException)

    expect(setPolicies).not.toHaveBeenCalled()
  })

  it('should accept setPolicies when pwnedRecheckEnabled and HIBP key is valid hex', async () => {
    configGet.mockReturnValue('a'.repeat(64))
    setPolicies.mockResolvedValue({ ok: 1 })
    const res = createRes()

    await controller.setPolicies(
      {
        pwnedRecheckEnabled: true,
      } as any,
      res as any,
    )

    expect(setPolicies).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('should return hibp-keystatus invalid when key cannot decode to 32 bytes', async () => {
    configGet.mockReturnValue('not-base64')
    const res = createRes()

    await controller.hibpKeyStatus(res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      data: { valid: false, reason: 'Clé invalide (base64) : doit décoder en 32 bytes' },
    })
  })

  it('should return policies payload', async () => {
    getPolicies.mockResolvedValue({ len: 10 })
    const res = createRes()

    await controller.getPolicies(res as any)

    expect(getPolicies).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ data: { len: 10 } })
  })
})
