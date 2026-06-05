import { ConfigurationService } from '~/settings/configuration.service';

describe('ConfigurationService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        application: { lang: 'en', logLevel: 'info' },
        mongoose: { uri: 'mongodb://localhost:27017/sesame', options: { directConnection: true } },
        ioredis: { uri: 'redis://localhost:6379/0' },
        axios: { options: { timeout: 5000 } },
        cron: { handlerExpression: '0 * * * *' },
        factorydrive: { options: { default: 'local' } },
        mailer: { host: 'smtp.local', port: 25, sender: 'noreply@local' },
        frontPwd: { url: 'http://localhost:3000' },
        lifecycle: { triggerCronExpression: '*/5 * * * *' },
        identities: { doublonSearchAttributes: [] },
        sms: { host: '', systemId: '', sourceAddr: '', regionCode: 'FR' },
        swagger: { path: '/swagger', api: '/swagger/json' },
      };

      return values[key];
    }),
  };

  const mongoConnection = {
    readyState: 0,
    name: 'sesame',
    db: null,
  };

  const redis = {
    info: jest.fn().mockRejectedValue(new Error('offline')),
    ping: jest.fn().mockRejectedValue(new Error('offline')),
  };

  let service: ConfigurationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConfigurationService(configService as any, mongoConnection as any, redis as any);
  });

  it('should expose masked environment variables, dependencies and resolved config', async () => {
    const previousJwtSecret = process.env.SESAME_JWT_SECRET;
    const previousLogLevel = process.env.SESAME_LOG_LEVEL;
    process.env.SESAME_JWT_SECRET = 'secret-value';
    process.env.SESAME_LOG_LEVEL = 'info';

    try {
      const payload = await service.getConfiguration();

      const jwtVariable = payload.environment.api.find((entry) => entry.key === 'SESAME_JWT_SECRET');
      const logVariable = payload.environment.api.find((entry) => entry.key === 'SESAME_LOG_LEVEL');

      expect(jwtVariable).toEqual({
        key: 'SESAME_JWT_SECRET',
        value: '***',
        sensitive: true,
      });
      expect(logVariable?.value).toBe('info');
      expect(payload.resolvedConfig.sms).toEqual(expect.objectContaining({ password: '***' }));
      expect(payload.frameworks.node).toBe(process.version);
      expect(payload.container.apiRootDir).toBeTruthy();
      expect(payload.container.webRootDir).toContain('web');
      expect(payload.processes.api.pid).toBe(process.pid);
      expect(payload.frameworks.api.nestjs).toBeTruthy();
      expect(payload.frameworks.api.mongoose).toBeTruthy();
      expect(payload.frameworks.api.ioredis).toBeTruthy();
      expect(payload.frameworks.web.nuxt).toBeTruthy();
      expect(payload.dependencies.mongodb.status).toBe('down');
      expect(payload.dependencies.redis.status).toBe('down');
      expect(payload.dependencies.mongodb.driverVersion).toBeTruthy();
      expect(payload.dependencies.redis.driverVersion).toBeTruthy();
    } finally {
      if (previousJwtSecret === undefined) {
        delete process.env.SESAME_JWT_SECRET;
      } else {
        process.env.SESAME_JWT_SECRET = previousJwtSecret;
      }

      if (previousLogLevel === undefined) {
        delete process.env.SESAME_LOG_LEVEL;
      } else {
        process.env.SESAME_LOG_LEVEL = previousLogLevel;
      }
    }
  });
});
