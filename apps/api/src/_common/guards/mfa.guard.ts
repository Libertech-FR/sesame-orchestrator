import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_REQUIRE_MFA } from '~/_common/decorators/require-mfa.decorator';

@Injectable()
export class MfaGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiresMfa = this.reflector.getAllAndOverride<boolean>(META_REQUIRE_MFA, [
      context.getClass(),
      context.getHandler(),
    ]);
    if (!requiresMfa) return true;

    const request = context.switchToHttp().getRequest<{ user?: { mfaVerified?: boolean } }>();
    if (request?.user?.mfaVerified) return true;
    throw new ForbiddenException('MFA required');
  }
}
