import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import ConfigInstance from './config';
import { LogLevel } from '@nestjs/common';

declare const module: any;
(async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, {
    logger: setLogLevel() as LogLevel[],
  });
  if (process.env.production != 'production') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./swagger').default(app);
  }
  await app.listen(3000);
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose((): Promise<void> => app.close());
  }
})();

function setLogLevel(): Array<string> {
  let loggerOptions = ['error', 'warn', 'fatal'];
  const configInstance = ConfigInstance();
  switch (configInstance['logLevel']) {
    case 'fatal':
      loggerOptions = ['fatal'];
      break;
    case 'error':
      loggerOptions = ['error', 'fatal'];
      break;
    case 'warn':
      loggerOptions = ['error', 'warn', 'fatal'];
      break;
    case 'info':
      loggerOptions = ['error', 'warn', 'fatal', 'log', 'verbose'];
      break;
    case 'debug':
      loggerOptions = ['error', 'warn', 'fatal', 'log', 'verbose', 'debug'];
      break;
  }
  return loggerOptions;
}
