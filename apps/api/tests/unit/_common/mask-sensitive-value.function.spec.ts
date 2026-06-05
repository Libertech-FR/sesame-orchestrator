import { isSensitiveEnvKey, maskSensitiveValue } from '~/_common/functions/mask-sensitive-value.function';

describe('mask-sensitive-value.function', () => {
  it('should detect sensitive keys', () => {
    expect(isSensitiveEnvKey('SESAME_JWT_SECRET')).toBe(true);
    expect(isSensitiveEnvKey('SESAME_LOG_LEVEL')).toBe(false);
  });

  it('should mask sensitive values', () => {
    expect(maskSensitiveValue('SESAME_JWT_SECRET', 'super-secret')).toEqual({
      value: '***',
      sensitive: true,
    });
  });

  it('should mask credentials in URIs', () => {
    expect(maskSensitiveValue('SESAME_MONGO_URI', 'mongodb://user:pass@host:27017/db')).toEqual({
      value: 'mongodb://***:***@host:27017/db',
      sensitive: true,
    });
  });
});
