import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { Response } from 'express';
import passport from 'passport';
import { rawBodyBuffer } from '~/_common/middlewares/raw-body-buffer.middleware';
import { AllExceptionFilter } from './_common/filters/all-exception.filter';
import { IdentitiesValidationFilter } from './_common/filters/identities-validation.filter';
import { MongooseValidationFilter } from './_common/filters/mongoose-validation.filter';
import { getLogLevel } from './_common/functions/get-log-level';
import { AppModule } from './app.module';
import configInstance from './config';
import { InternalLogger } from './core/logger/internal.logger';

declare const module: any;
(async (): Promise<void> => {
  const cfg = configInstance();
  const logger = new InternalLogger({
    logLevel: getLogLevel(cfg?.application?.logLevel),
    mongoose: cfg?.mongoose,
  });
  await logger.initialize();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    rawBody: true,
    cors: true,
    logger,
  });
  app.use((_: any, res: Response, next: () => void) => {
    res.removeHeader('x-powered-by');
    next();
  });
  app.use(passport.initialize());
  app.use(rawBodyBuffer(cfg?.application?.bodyParser));
  app.use(cookieParser());
  if (process.env.production !== 'production') {
    (await import('./swagger')).default(app);
  }

  app.useGlobalFilters(new AllExceptionFilter(), new MongooseValidationFilter(), new IdentitiesValidationFilter());
  await app.listen(4000, async (): Promise<void> => {
    logger.log(`Sesame - Orchestrator is READY on <http://127.0.0.1:4000> !`);
  });

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose((): Promise<void> => app.close());
  }
})();
