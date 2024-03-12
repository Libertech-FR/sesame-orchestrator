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
    const stack = optionalParams[optionalParams.length - (optionalParams.length === 3 ? -2 : -1)];
    const context = optionalParams.length === 3 ? optionalParams[optionalParams.length - 1] : null;
    if (options instanceof Object) {
      if (options.target.includes(InternalLogLevel.DB)) this.commonLogDb({ level: 'error', message, context }, options);
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }
    const args = [stack];
    if (context) args.push(context);
    super.error(...[message, ...args]);
  }

  warn(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    const context = optionalParams[optionalParams.length - 1];
    if (options instanceof Object) {
      if (options.target.includes(InternalLogLevel.DB)) this.commonLogDb({ level: 'warn', message, context }, options);
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }
    const args = [];
    if (context) args.push(context);
    super.warn(...[message, ...args]);
  }

  log(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    const context = optionalParams[optionalParams.length - 1];
    if (options instanceof Object) {
      if (options.target.includes(InternalLogLevel.DB)) this.commonLogDb({ level: 'log', message, context }, options);
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }
    const args = [];
    if (context) args.push(context);
    super.log(...[message, ...args]);
  }

  debug(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    const context = optionalParams[optionalParams.length - 1];
    if (options instanceof Object) {
      if (options.target.includes(InternalLogLevel.DB)) this.commonLogDb({ level: 'debug', message, context }, options);
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }
    const args = [];
    if (context) args.push(context);
    super.debug(...[message, ...args]);
  }

  verbose(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    const context = optionalParams[optionalParams.length - 1];
    if (options instanceof Object) {
      if (options.target.includes(InternalLogLevel.DB))
        this.commonLogDb({ level: 'verbose', message, context }, options);
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }
    const args = [];
    if (context) args.push(context);
    super.verbose(...[message, ...args]);
  }

  fatal(message: any, ...optionalParams: [...any, string?]) {
    const [options] = optionalParams;
    const context = optionalParams[optionalParams.length - 1];
    if (options instanceof Object) {
      if (options.target.includes(InternalLogLevel.DB)) this.commonLogDb({ level: 'fatal', message, context }, options);
      if (!options.target.includes(InternalLogLevel.CONSOLE)) return;
    }
    const args = [];
    if (context) args.push(context);
    super.fatal(...[message, ...args]);
  }

  private commonLogDb(
    payload: {
      level: string;
      message: any;
      context?: string;
    },
    options: InternalLogOptions,
  ): void {
    console.log('logging');
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
      super.error('Failed to log to the database', e, this.constructor.name);
      console.log('Failed to log to the database', e);
    }
  }
}
