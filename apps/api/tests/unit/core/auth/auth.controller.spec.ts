import { AuthController } from '~/core/auth/auth.controller'

describe('AuthController', () => {
  const createTokens = jest.fn()
  const getSessionData = jest.fn()
  const renewTokens = jest.fn()
  const clearSession = jest.fn()
  const getRolesBuilder = jest.fn()

  const authService = {
    createTokens,
    getSessionData,
    renewTokens,
    clearSession,
  }

  const rolesService = {
    getRolesBuilder,
  }

  const createRes = () => {
    const json = jest.fn()
    const send = jest.fn()
    const status = jest.fn(() => ({ json, send }))
    return { status, json, send }
  }

  let controller: AuthController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new AuthController({} as any, authService as any, rolesService as any)
  })

  it('should authenticate local user and return tokens', async () => {
    createTokens.mockResolvedValue({ access_token: 'a', refresh_token: 'r' })
    const res = createRes()
    const user = { _id: '1', email: 'john@example.org' }

    await controller.authenticateWithLocal(res as any, user as any)

    expect(createTokens).toHaveBeenCalledWith(user)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      access_token: 'a',
      refresh_token: 'r',
      user,
    })
  })

  it('should return current session payload with access grants', async () => {
    getSessionData.mockResolvedValue({
      _id: '1',
      email: 'john@example.org',
      security: { secretKey: 'abc' },
      metadata: { debug: true },
    })
    getRolesBuilder.mockResolvedValue({
      getGrants: () => ({ admin: { '/core': ['read:any'] } }),
    })
    const res = createRes()
    const identity = { _id: '1', email: 'john@example.org' }

    await controller.session(res as any, identity as any)

    expect(getSessionData).toHaveBeenCalledWith(identity)
    expect(res.status).toHaveBeenCalledWith(200)
    const payload = (res.json as jest.Mock).mock.calls[0][0]
    expect(payload.user).toMatchObject({
      _id: '1',
      email: 'john@example.org',
      access: { admin: { '/core': ['read:any'] } },
    })
    expect(payload.user.sseToken).toBeDefined()
  })

  it('should refresh tokens and return new payload', async () => {
    renewTokens.mockResolvedValue([
      { security: { secretKey: 'abc' } },
      { access_token: 'new-a', refresh_token: 'new-r' },
    ])
    const res = createRes()

    await controller.refresh(res as any, { refresh_token: 'old-r' })

    expect(renewTokens).toHaveBeenCalledWith('old-r')
    expect(res.status).toHaveBeenCalledWith(200)
    const payload = (res.json as jest.Mock).mock.calls[0][0]
    expect(payload.access_token).toBe('new-a')
    expect(payload.refresh_token).toBe('new-r')
    expect(payload.sseToken).toBeDefined()
  })

  it('should clear session on logout', async () => {
    clearSession.mockResolvedValue(undefined)
    const res = createRes()

    await controller.logout(res as any, 'Bearer jwt-token')

    expect(clearSession).toHaveBeenCalledWith('jwt-token')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalled()
  })
})
