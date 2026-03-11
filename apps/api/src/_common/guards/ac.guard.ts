import { CanActivate, ExecutionContext, Inject, Injectable, Logger, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACGuard as AcGuardInternal, RolesBuilder } from 'nest-access-control';
import { META_UNPROTECTED } from '~/_common/decorators/public.decorator';
import { AC_ADMIN_ROLE, AC_GUEST_ROLE } from '../types/ac-types';
import { ApiSession } from '../data/api-session';
import { ConsoleSession } from '../data/console-session';
import { Request } from 'express';

export function AcGuard(): Type<CanActivate> {
  @Injectable()
  class CustomAcGuard<User extends any = any> extends AcGuardInternal<User> implements CanActivate {
    @Inject(Reflector)
    public readonly __reflector!: Reflector;

    protected logger: Logger = new Logger(CustomAcGuard.name);

    public constructor(reflector: Reflector, roleBuilder: RolesBuilder) {
      super(reflector, roleBuilder);
    }

    protected isUnProtected(context: ExecutionContext): boolean {
      return this.__reflector.getAllAndOverride<boolean>(META_UNPROTECTED, [
        context.getClass(),
        context.getHandler(),
      ]);
    }

    public async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<Request & { user: Express.User & (ApiSession | ConsoleSession) }>();
      const roleOrRoles = await this.getUserRoles(context)
      const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]

      if (roles.includes(AC_ADMIN_ROLE)) {
        this.logger.verbose(`User <${request.user._id}, ${request.user.username}> wants to access <${request.method}::${request.route.path}>. Roles: [${roles.join(', ')}] -> [is allowed]`);
        return true;
      }

      const result = this.isUnProtected(context) || await super.canActivate(context);

      if (request.user) {
        this.logger.verbose(`User <${request.user._id}, ${request.user.username}> wants to access <${request.method}::${request.route.path}>. Roles: [${roles.join(', ')}] -> [${result ? 'is allowed' : 'is not allowed'}]`);
      }

      return result;
    }

    public async getUser(context: ExecutionContext): Promise<User> {
      //console.log('isUnProtected', this.isUnProtected(context))
      if (this.isUnProtected(context)) {
        return {} as User;
      }

      //console.log('getUser', await super.getUser(context))
      return await super.getUser(context);
    }

    public async getUserRoles(context: ExecutionContext): Promise<string | string[]> {
      const roles = await super.getUserRoles(context);

      //console.log('getUserRoles', roles)

      if (!roles || roles.length === 0) {
        return [AC_GUEST_ROLE];
      }

      return roles;
    }
  }

  return CustomAcGuard;
}
