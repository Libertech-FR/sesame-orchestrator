import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { META_REQUIRE_MFA } from '~/_common/decorators/require-mfa.decorator';

@Injectable()
export class MfaGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiresMfa = this.reflector.getAllAndOverride<boolean>(META_REQUIRE_MFA, [
      context.getClass(),
      context.getHandler(),
    ]);
    if (!requiresMfa) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { mfaVerified?: boolean; mfaVerifiedAt?: number | null } }>();
    if (!request?.user?.mfaVerified) throw new ForbiddenException('MFA required');

    const maxAgeSeconds = this.config.get<number>('application.mfaStepUpMaxAgeSeconds');
    const maxAgeMs = Math.max(0, maxAgeSeconds) * 1000;
    if (maxAgeMs <= 0) return true;

    const verifiedAt = typeof request.user.mfaVerifiedAt === 'number' ? request.user.mfaVerifiedAt : null;
    if (!verifiedAt) throw new ForbiddenException('MFA required');
    if (Date.now() - verifiedAt > maxAgeMs) throw new ForbiddenException('MFA required');
    return true;
  }
}
