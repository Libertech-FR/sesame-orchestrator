import { RedisOptions } from 'ioredis';

/** Options NestJS Redis transport (ioredis + retryAttempts/retryDelay). */
export type RedisMicroserviceTransportOptions = RedisOptions & {
  retryAttempts?: number;
  retryDelay?: number;
};

/**
 * Convertit SESAME_REDIS_URI en options ioredis (host/port/db) pour le transport Redis NestJS.
 * Plus fiable que `url` seul avec ClientsModule / createMicroservice.
 */
export function redisOptionsFromUri(uri: string, extra?: RedisOptions): RedisOptions {
  const parsed = new URL(uri);
  const db = parsed.pathname?.replace(/^\//, '');
  const port = parsed.port ? parseInt(parsed.port, 10) : 6379;

  return {
    host: parsed.hostname,
    port,
    ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    ...(db !== '' && !Number.isNaN(Number(db)) ? { db: Number(db) } : {}),
    ...extra,
  };
}

/** Options recommandées pour @nestjs/microservices (pub/sub Redis). */
export function redisMicroserviceTransportOptions(uri: string): RedisMicroserviceTransportOptions {
  return {
    ...redisOptionsFromUri(uri, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    }),
    retryAttempts: 0,
    retryDelay: 0,
  };
}
