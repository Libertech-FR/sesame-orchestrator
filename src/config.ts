export default () => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    user: process.env.REDIS_USER || '',
    password: process.env.REDIS_PASSWORD || '',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  nameQueue: process.env.NAME_QUEUE || 'backend',
  secret: process.env.SECRET || 'mySecret',
});
