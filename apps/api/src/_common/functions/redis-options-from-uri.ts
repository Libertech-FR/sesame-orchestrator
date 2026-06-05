import { RedisOptions } from 'ioredis';

/**
 * Convertit SESAME_REDIS_URI en options ioredis (host/port/db) pour le transport Redis NestJS.
 * Plus fiable que `url` seul.
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
