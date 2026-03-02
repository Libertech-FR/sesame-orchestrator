import { CanActivate, ExecutionContext, Inject, Injectable, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACGuard as AcGuardInternal, RolesBuilder } from 'nest-access-control';
import { META_UNPROTECTED } from '~/_common/decorators/public.decorator';

export function AcGuard(): Type<CanActivate> {
  @Injectable()
  class CustomAcGuard<User extends any = any> extends AcGuardInternal<User> implements CanActivate {
    @Inject(Reflector)
    public readonly __reflector!: Reflector;

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
      const roleOrRoles = await this.getUserRoles(context)
      const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]
      console.log('canActivate', roles)
      if (roles.includes('admin')) {
        return true;
      }

      return this.isUnProtected(context) || super.canActivate(context);
    }

    public async getUser(context: ExecutionContext): Promise<User> {
      console.log('isUnProtected', this.isUnProtected(context))
      if (this.isUnProtected(context)) {
        return {} as User;
      }

      console.log('getUser', await super.getUser(context))
      return await super.getUser(context);
    }

    public async getUserRoles(context: ExecutionContext): Promise<string | string[]> {
      const roles = await super.getUserRoles(context);

      console.log('getUserRoles', roles)

      if (!roles || roles.length === 0) {
        return ['guest'];
      }

      return roles;
    }
  }

  return CustomAcGuard;
}
