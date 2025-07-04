import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RequestContext } from 'nestjs-request-context';

export interface AbstractServiceContext {
  [key: string | number]: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  moduleRef?: ModuleRef;
  req?: Request & { user?: Express.User };
  eventEmitter?: EventEmitter2;
  serviceName?: string;
  moduleName?: string;
}

@Injectable()
export abstract class AbstractService {
  protected logger: Logger;
  protected moduleRef: ModuleRef;
  private readonly _req?: Request & { user?: Express.User & any } // eslint-disable-line
  protected eventEmitter?: EventEmitter2;

  private _customServiceName: string;
  private _customModuleName: string;

  protected constructor(context?: AbstractServiceContext) {
    this.moduleRef = context?.moduleRef;
    this._req = context?.req;
    this.logger = new Logger(this.serviceName);
    this.eventEmitter = context?.eventEmitter;

    this._customModuleName = context?.moduleName
    this._customServiceName = context?.serviceName
  }

  protected get request():
    | (Request & {
      user?: Express.User & any // eslint-disable-line
    })
    | null {
    return this._req || RequestContext.currentContext?.req;
  }

  public get moduleName(): string {
    //TODO: change modulename from module ref ?
    if (!this.request) throw new Error('Request is not defined in ' + this.constructor.name);
    const moduleName = this.request.path.split('/').slice(1).shift();
    return this._customModuleName || moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  }

  public get serviceName(): string {
    if (!this.constructor.name) throw new Error('Service name is not defined in ' + this.constructor.name);
    return this._customServiceName || this.constructor.name.replace(/Service$/, '');
  }
}
