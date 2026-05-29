import {
  redisMicroserviceTransportOptions,
  redisOptionsFromUri,
} from '~/_common/functions/redis-options-from-uri';

describe('redisOptionsFromUri', () => {
  it('parses host, port, db and password from a redis URI', () => {
    expect(redisOptionsFromUri('redis://:secret@sesame-redis:6379/2')).toEqual({
      host: 'sesame-redis',
      port: 6379,
      password: 'secret',
      db: 2,
    });
  });

  it('adds microservice-friendly retry defaults', () => {
    const opts = redisMicroserviceTransportOptions('redis://sesame-redis:6379/0');
    expect(opts.host).toBe('sesame-redis');
    expect(opts.port).toBe(6379);
    expect(opts.retryAttempts).toBe(0);
    expect(opts.maxRetriesPerRequest).toBeNull();
  });
});
