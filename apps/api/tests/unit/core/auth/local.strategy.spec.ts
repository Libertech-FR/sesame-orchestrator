import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from '~/core/auth/_strategies/local.strategy';

describe('LocalStrategy', () => {
  const authenticateWithLocal = jest.fn();
  const authService = {
    authenticateWithLocal,
  };

  let strategy: LocalStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new LocalStrategy(authService as any);
  });

  it('should call done with mapped user when authentication succeeds', async () => {
    authenticateWithLocal.mockResolvedValue({
      toObject: () => ({
        _id: 'a1',
        username: 'john',
        email: 'john@example.org',
        password: 'hashed',
        metadata: { test: true },
      }),
    });
    const done = jest.fn();

    await strategy.validate({ ip: '203.0.113.10', headers: {}, socket: {} } as any, 'john', 'secret', done);

    expect(authenticateWithLocal).toHaveBeenCalledWith('john', 'secret', '203.0.113.10');
    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        _id: 'a1',
        username: 'john',
        email: 'john@example.org',
      }),
    );
    const passedUser = (done as jest.Mock).mock.calls[0][1];
    expect(passedUser.password).toBeUndefined();
  });

  it('should call done with UnauthorizedException when authentication fails', async () => {
    authenticateWithLocal.mockResolvedValue(null);
    const done = jest.fn();

    await strategy.validate({ ip: '203.0.113.10', headers: {}, socket: {} } as any, 'john', 'wrong', done);

    expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedException), false);
  });

  it('should extract first ip from x-forwarded-for header', async () => {
    authenticateWithLocal.mockResolvedValue({
      toObject: () => ({
        _id: 'a1',
        username: 'john',
        email: 'john@example.org',
      }),
    });
    const done = jest.fn();

    await strategy.validate(
      {
        headers: {
          'x-forwarded-for': '198.51.100.10, 10.0.0.1',
        },
        socket: {},
      } as any,
      'john',
      'secret',
      done,
    );

    expect(authenticateWithLocal).toHaveBeenCalledWith('john', 'secret', '198.51.100.10');
  });
});
