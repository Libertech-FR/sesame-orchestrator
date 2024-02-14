import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configInstance from './config';
import { All, LogLevel, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import { createLogger } from 'winston';
import * as winston from 'winston';
import 'winston-mongodb';
import { AllExceptionFilter } from './_common/filters/all-exception.filter';
import { IdentitiesValidationFilter } from './_common/filters/identities-validation.filter';
import { MongooseValidationFilter } from './_common/filters/mongoose-validation.filter';

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
      level: 'debug',
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
    // rawBody: true,
    cors: true,
  });
  // eslint-disable-next-line
  // app.use((_: any, res: Response, next: () => void) => {
  //   res.removeHeader('x-powered-by')
  //   next()
  // })
  // app.use(passport.initialize())
  // app.use(rawBodyBuffer(cfg?.application?.bodyParser));
  if (process.env.production !== 'production') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    (await import('./swagger')).default(app);
  }

  app.useGlobalFilters(new AllExceptionFilter(), new MongooseValidationFilter(), new IdentitiesValidationFilter());
  await app.listen(4000, async (): Promise<void> => {
    Logger.log(`Sesame - Orchestrator is READY on <http://127.0.0.1:4000> !`);
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
