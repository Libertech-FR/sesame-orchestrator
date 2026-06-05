import './instrument';

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express, { Response } from 'express';
import passport from 'passport';
import { rawBodyBuffer } from '~/_common/middlewares/raw-body-buffer.middleware';
import { getLogLevel } from './_common/functions/get-log-level';
import { AppModule } from './app.module';
import configInstance from './config';
import { InternalLogger } from './core/logger/internal.logger';
import { readFileSync } from 'fs';
import * as http from 'http';
import * as https from 'https';
import { ShutdownObserver } from './_common/observers/shutdown.observer';
import { SesameIoAdapter } from './_common/adapters/sesame-io.adapter';
import { useContainer } from 'class-validator';

declare const module: any;
(async (): Promise<void> => {
  const cfg = configInstance();
  const logger = new InternalLogger({
    logLevel: getLogLevel(cfg?.application?.logLevel),
    mongoose: cfg?.mongoose,
  });
  await logger.initialize();

  const extraOptions = <any>{};
  if (cfg.application?.https?.enabled) {
    try {
      extraOptions.httpsOptions = {
        key: readFileSync(cfg.application?.https?.key),
        cert: readFileSync(cfg.application?.https?.cert),
      };
      logger.log('HTTPS is enabled !');
    } catch (error) {
      logger.error('Error while reading https key and cert', error);
    }
  }

  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(server), {
    snapshot: true,
    bodyParser: false,
    rawBody: true,
    cors: true,
    logger,
    ...extraOptions,
  });

  if (cfg.application.trustProxy) {
    app.set('trust proxy', 1);
  }
  app.use((_: any, res: Response, next: () => void) => {
    res.removeHeader('x-powered-by');
    next();
  });
  app.use(passport.initialize());
  app.use(rawBodyBuffer(cfg?.application?.bodyParser));
  app.use(cookieParser());
  if (process.env.production !== 'production') {
    await (await import('./swagger')).default(app);
  }

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const shutdownObserver = app.get(ShutdownObserver);
  const httpServer = http.createServer(server);
  const ioAdapter = new SesameIoAdapter(httpServer);

  app.useWebSocketAdapter(ioAdapter);
  await app.init();

  httpServer.listen(4000);
  shutdownObserver.addHttpServer(httpServer);
  logger.log(`Sesame - Orchestrator is READY on <http://127.0.0.1:4000> !`);

  if (cfg.application?.https?.enabled) {
    const httpsServer = https.createServer(extraOptions.httpsOptions!, server);

    ioAdapter.attachToServer(httpsServer);
    httpsServer.listen(4443);
    shutdownObserver.addHttpServer(httpsServer);
    logger.log(`Sesame - Orchestrator is READY on <https://127.0.0.1:4443> !`);
  }

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose((): Promise<void> => app.close());
  }
})();
