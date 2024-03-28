import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { Request } from 'express';
import { Connection, connect } from 'mongoose';

export interface InternalLoggerOptions {
  logLevel: LogLevel[];
  mongoose: {
    uri: string;
    options: MongooseModuleOptions;
  };
}

export enum InternalLogLevel {
  CONSOLE = 'console',
  DB = 'db',
}

export interface InternalLogOptions {
  target: InternalLogLevel[];
  request?: Request;
  createdBy?: string;
}

@Injectable()
export class InternalLogger extends ConsoleLogger {
  protected connection: Connection;

  public constructor(private _options?: InternalLoggerOptions) {
    super();
    this.setLogLevels(_options?.logLevel);
  }

  public async initialize() {
    super.log('Initializing logs database connection...', this.constructor.name);
    try {
      const mongoose = await connect(this._options.mongoose.uri, this._options.mongoose.options);
      this.connection = mongoose.connection;
    } catch (e) {
      super.error('Failed to connect to the logs database', e, this.constructor.name);
      setTimeout(() => this.initialize(), 5000);
    }
  }

  error(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    //TODO: fix optionalParams system
    const lastParam = optionalParams[optionalParams.length - 1];

    if (options instanceof Object && options.target) {
      if (options.target.includes(InternalLogLevel.DB))
        this.commonLogDb(
          { level: 'error', message, context: typeof lastParam === 'string' ? lastParam : null },
          options,
        );
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }

    super.error(...[message, ...optionalParams]);
  }

  warn(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    const lastParam = optionalParams[optionalParams.length - 1];

    if (options instanceof Object && options.target) {
      if (options.target.includes(InternalLogLevel.DB))
        this.commonLogDb(
          { level: 'warn', message, context: typeof lastParam === 'string' ? lastParam : null },
          options,
        );
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }

    super.warn(...[message, ...optionalParams]);
  }

  log(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    const lastParam = optionalParams[optionalParams.length - 1];

    if (options instanceof Object && options.target) {
      if (options.target.includes(InternalLogLevel.DB))
        this.commonLogDb({ level: 'log', message, context: typeof lastParam === 'string' ? lastParam : null }, options);
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }

    super.log(...[message, ...optionalParams]);
  }

  debug(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    const lastParam = optionalParams[optionalParams.length - 1];

    if (options instanceof Object && options.target) {
      if (options.target.includes(InternalLogLevel.DB))
        this.commonLogDb(
          { level: 'debug', message, context: typeof lastParam === 'string' ? lastParam : null },
          options,
        );
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }

    super.debug(...[message, ...optionalParams]);
  }

  verbose(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    const lastParam = optionalParams[optionalParams.length - 1];

    if (options instanceof Object && options.target) {
      if (options.target.includes(InternalLogLevel.DB))
        this.commonLogDb(
          { level: 'verbose', message, context: typeof lastParam === 'string' ? lastParam : null },
          options,
        );
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }

    super.verbose(...[message, ...optionalParams]);
  }

  fatal(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    const lastParam = optionalParams[optionalParams.length - 1];

    if (options instanceof Object && options.target) {
      if (options.target.includes(InternalLogLevel.DB))
        this.commonLogDb(
          { level: 'fatal', message, context: typeof lastParam === 'string' ? lastParam : null },
          options,
        );
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }

    super.fatal(...[message, ...optionalParams]);
  }

  private commonLogDb(
    payload: {
      level: string;
      message: any;
      context?: string;
    },
    options: InternalLogOptions,
  ): void {
    const data = payload.message instanceof Object ? payload.message : { message: payload.message };
    const metadata = {
      createdAt: new Date(),
      createdBy: options.createdBy || 'console',
    };
    if (payload.context) metadata['context'] = payload.context;
    // TODO: fix request user structure
    if (options.request && !options.createdBy) metadata['createdBy'] = (options.request.user as any)?.id;

    try {
      this.connection.collection('logs').insertOne({
        level: payload.level,
        data,
        metadata,
      });
    } catch (e) {
      super.fatal('Failed to log to the database', e, this.constructor.name);
      super[payload.level](payload.message, ...payload.context);
    }
  }
}
