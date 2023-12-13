import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configInstance from './config';
import { LogLevel, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

declare const module: any;
(async (): Promise<void> => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: setLogLevel() as LogLevel[],
    cors: true,
  });
  // app.use(rawBodyBuffer(cfg?.application?.bodyParser));
  if (process.env.production !== 'production') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    (await import('./swagger')).default(app);
  }
  await app.listen(3000, async (): Promise<void> => {
    Logger.log(`Application is running on port: ${process.env.PORT || 3000}`);
  });
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose((): Promise<void> => app.close());
  }
})();

function setLogLevel(): LogLevel[] {
  const config = configInstance();
  const logLevelMap: Record<LogLevel | string, LogLevel[]> = {
    fatal: ['fatal'],
    error: ['error', 'fatal'],
    warn: ['error', 'fatal', 'warn'],
    info: ['error', 'fatal', 'warn', 'log'],
    debug: ['error', 'fatal', 'warn', 'log', 'debug'],
    verbose: ['error', 'fatal', 'warn', 'log', 'debug', 'verbose'],
  };
  return logLevelMap[config.logLevel] || logLevelMap['warn'];
}
