import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { JwtStrategy } from '~/core/auth/_strategies/jwt.strategy'

describe('JwtStrategy', () => {
  const verifyIdentity = jest.fn()
  const authService = { verifyIdentity }
  const configService = {
    get: jest.fn().mockReturnValue('jwt-secret'),
  }

  let strategy: JwtStrategy

  beforeEach(() => {
    jest.clearAllMocks()
    strategy = new JwtStrategy(authService as any, configService as any)
  })

  it('should reject when payload has no identity', async () => {
    const done = jest.fn()

    await strategy.validate({} as any, { jti: 'x', scopes: [] } as any, done)

    expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedException), false)
  })

  it('should reject when verifyIdentity returns null', async () => {
    verifyIdentity.mockResolvedValue(null)
    const done = jest.fn()
    const payload = { jti: 'x', scopes: ['sesame'], identity: { _id: '1', roles: ['user'] } }

    await strategy.validate({} as any, payload as any, done)

    expect(done).toHaveBeenCalledWith(expect.any(ForbiddenException), false)
  })

  it('should grant admin role to API token without roles', async () => {
    verifyIdentity.mockResolvedValue({ _id: 'k1' })
    const done = jest.fn()
    const payload = { jti: 'x', scopes: ['api'], identity: { _id: 'k1', roles: [] } }

    await strategy.validate({} as any, payload as any, done)

    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        _id: 'k1',
        roles: ['admin'],
      }),
    )
  })
})
