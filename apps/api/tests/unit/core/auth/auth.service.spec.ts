import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { AuthService } from '~/core/auth/auth.service'

describe('AuthService', () => {
  const redisGet = jest.fn()
  const redisSet = jest.fn()
  const redisExpire = jest.fn()
  const redisDel = jest.fn()
  const redis = {
    get: redisGet,
    set: redisSet,
    expire: redisExpire,
    del: redisDel,
  }

  const agentsFindOne = jest.fn()
  const agentsService = {
    findOne: agentsFindOne,
    model: {
      countDocuments: jest.fn(),
    },
  }

  const keyringsFindOne = jest.fn()
  const keyringsService = {
    findOne: keyringsFindOne,
  }

  const jwtSign = jest.fn()
  const jwtDecode = jest.fn()
  const jwtService = {
    sign: jwtSign,
    decode: jwtDecode,
  }

  let service: AuthService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new AuthService({} as any, agentsService as any, keyringsService as any, jwtService as any, redis as any)
  })

  it('should create access+refresh tokens and persist redis session', async () => {
    jwtSign.mockReturnValue('access-token')
    agentsFindOne.mockResolvedValue({
      toJSON: () => ({ _id: 'a1', username: 'john' }),
    })
    redisSet.mockResolvedValue('OK')
    redisExpire.mockResolvedValue(1)

    const result = await service.createTokens({ _id: 'a1', username: 'john', roles: ['user'] } as any)

    expect(result.access_token).toBe('access-token')
    expect(result.refresh_token).toBeDefined()
    expect(redisSet).toHaveBeenCalled()
    expect(redisExpire).toHaveBeenCalled()
  })

  it('should create access token only when refresh_token is false', async () => {
    jwtSign.mockReturnValue('access-token')

    const result = await service.createTokens({ _id: 'a1', username: 'john', roles: ['user'] } as any, false)

    expect(result).toEqual({ access_token: 'access-token' })
    expect(redisExpire).not.toHaveBeenCalled()
  })

  it('should renew tokens with existing refresh token', async () => {
    redisGet.mockResolvedValueOnce(JSON.stringify({ identityId: 'a1' }))
    agentsFindOne.mockResolvedValueOnce({
      _id: 'a1',
      toObject: () => ({ _id: 'a1', username: 'john', password: 'hash' }),
    })
    const createTokensSpy = jest.spyOn(service, 'createTokens').mockResolvedValue({
      access_token: 'new-a',
      refresh_token: 'existing-r',
    })

    const [identity, tokens] = await service.renewTokens('existing-r')

    expect(identity._id).toBe('a1')
    expect(tokens.access_token).toBe('new-a')
    expect(createTokensSpy).toHaveBeenCalledWith(
      { _id: 'a1', username: 'john' },
      'existing-r',
    )
  })

  it('should throw UnauthorizedException when renew token does not exist', async () => {
    redisGet.mockResolvedValue(null)

    await expect(service.renewTokens('missing-r')).rejects.toThrow(UnauthorizedException)
  })

  it('should throw ForbiddenException when identity is missing during renew', async () => {
    redisGet.mockResolvedValue(JSON.stringify({ identityId: 'a1' }))
    agentsFindOne.mockResolvedValue(null)

    await expect(service.renewTokens('existing-r')).rejects.toThrow(ForbiddenException)
  })

  it('should clear access and refresh tokens from redis', async () => {
    jwtDecode.mockReturnValue({ jti: 'jwt-id' })
    redisGet.mockResolvedValue(JSON.stringify({ refresh_token: 'refresh-id' }))
    redisDel.mockResolvedValue(1)

    await service.clearSession('jwt-token')

    expect(redisDel).toHaveBeenCalledWith('access_token:jwt-id')
    expect(redisDel).toHaveBeenCalledWith('refresh_token:refresh-id')
  })

  it('should verify api identity with keyring token', async () => {
    keyringsFindOne.mockResolvedValue({
      toObject: () => ({ _id: 'k1' }),
    })

    const result = await service.verifyIdentity({
      scopes: ['api'],
      identity: { _id: 'k1', token: 'abc' },
    } as any)

    expect(result).toEqual({ _id: 'k1' })
  })

  it('should return offline identity as-is for offline scope', async () => {
    const identity = { _id: 'console-1', username: 'console' }

    const result = await service.verifyIdentity({
      scopes: ['offline'],
      identity,
    } as any)

    expect(result).toBe(identity)
  })

  it('should return null for api scope when keyring is not found', async () => {
    keyringsFindOne.mockRejectedValue(new Error('not found'))

    const result = await service.verifyIdentity({
      scopes: ['api'],
      identity: { _id: 'k1', token: 'missing' },
    } as any)

    expect(result).toBeNull()
  })

  it('should verify jwt session scope with redis-backed session and matching secret key', async () => {
    redisGet.mockResolvedValue(
      JSON.stringify({
        identity: {
          security: {
            secretKey: 's3cr3t',
          },
        },
      }),
    )
    ;(agentsService.model.countDocuments as jest.Mock).mockResolvedValue(1)

    const result = await service.verifyIdentity({
      jti: 'jwt-id',
      scopes: ['sesame'],
      identity: { _id: 'a1' },
    } as any)

    expect(redisGet).toHaveBeenCalledWith('access_token:jwt-id')
    expect(agentsService.model.countDocuments).toHaveBeenCalledWith({
      _id: 'a1',
      'security.secretKey': 's3cr3t',
    })
    expect(result).toEqual({
      identity: {
        security: {
          secretKey: 's3cr3t',
        },
      },
    })
  })

  it('should return null for jwt session scope when no redis session exists', async () => {
    redisGet.mockResolvedValue(null)

    const result = await service.verifyIdentity({
      jti: 'missing-jti',
      scopes: ['sesame'],
      identity: { _id: 'a1' },
    } as any)

    expect(result).toBeNull()
  })

  it('should not delete anything when clearSession cannot decode jwt', async () => {
    jwtDecode.mockReturnValue(null)

    await service.clearSession('invalid-token')

    expect(redisDel).not.toHaveBeenCalled()
  })
})
