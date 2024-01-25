import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configInstance from './config';
import { LogLevel, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import { createLogger } from 'winston';
import * as winston from 'winston';
import 'winston-mongodb';

declare const module: any;
(async (): Promise<void> => {
  const winstonFormat = {
    pretty: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      nestWinstonModuleUtilities.format.nestLike('Sesame-orchestrator', {
        colors: true,
        prettyPrint: true,
      }),
    ),
    json: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Timestamp format
      winston.format.errors({ stack: true }), // Log stack trace if available
      winston.format.json(), // Format logs as JSON
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }), // Add additional metadata
    ),
  };

  const winstonTransports = {
    console: new winston.transports.Console({
      level: 'info',
      format: winstonFormat.pretty,
    }),
    mongodb: new winston.transports.MongoDB({
      db: configInstance().mongoose.uri,
      collection: 'logs',
      level: 'debug',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
      format: winstonFormat.json,
    }),
  };
  const winstonInstance = createLogger({
    transports: [winstonTransports.console, winstonTransports.mongodb],
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    //logger: setLogLevel() as LogLevel[],
    logger: WinstonModule.createLogger({
      instance: winstonInstance,
    }),
    cors: true,
  });
  // app.use(rawBodyBuffer(cfg?.application?.bodyParser));
  if (process.env.production !== 'production') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    (await import('./swagger')).default(app);
  }
  await app.listen(4000, async (): Promise<void> => {
    Logger.log(`Application is running on port: 4000`);
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
