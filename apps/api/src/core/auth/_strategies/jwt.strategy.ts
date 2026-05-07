import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { AgentType } from '~/_common/types/agent.type';
import { JwtPayload } from 'jsonwebtoken';
import { Keyrings } from '~/core/keyrings/_schemas/keyrings.schema';
import { Agents } from '~/core/agents/_schemas/agents.schema';
import { resolveClientIp } from '~/_common/functions/resolve-client-ip';
import ipRangeCheck from 'ip-range-check';

function isClientIpAllowed(allowedNetworks?: string[] | null, clientIp?: string | null): boolean {
  if (!Array.isArray(allowedNetworks) || allowedNetworks.length === 0) return true;
  if (!clientIp) return false;

  const normalizedRules = allowedNetworks.map((item) => `${item || ''}`.trim()).filter((item) => item.length > 0);
  if (normalizedRules.length === 0) return true;

  try {
    return ipRangeCheck(clientIp, normalizedRules);
  } catch {
    return false;
  }
}

function resolveAllowedNetworksFromVerifiedIdentity(verified: unknown): string[] | null {
  const v = verified as any;
  const direct = Array.isArray(v?.allowedNetworks) ? (v.allowedNetworks as string[]) : null;
  if (direct && direct.length > 0) return direct;

  const fromSecurity = Array.isArray(v?.security?.allowedNetworks) ? (v.security.allowedNetworks as string[]) : null;
  if (fromSecurity && fromSecurity.length > 0) return fromSecurity;

  const fromIdentitySecurity = Array.isArray(v?.identity?.security?.allowedNetworks) ? (v.identity.security.allowedNetworks as string[]) : null;
  if (fromIdentitySecurity && fromIdentitySecurity.length > 0) return fromIdentitySecurity;

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  protected logger: Logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    super({
      secretOrKey: `${config.get<string>('jwt.options.secret')}`,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  // noinspection JSUnusedGlobalSymbols
  public async validate(
    req: Request,
    payload: JwtPayload & { identity: AgentType; mfaVerified?: boolean; mfaVerifiedAt?: number | null },
    done: VerifiedCallback,
  ): Promise<void> {
    this.logger.verbose(`Atempt to authenticate with JTI: <${payload.jti}>`);
    if (!payload?.identity) return done(new UnauthorizedException(), false);
    const user = await this.auth.verifyIdentity(payload);

    if (!user) return done(new ForbiddenException(), false);

    const clientIp = resolveClientIp(req);
    const allowedNetworks = resolveAllowedNetworksFromVerifiedIdentity(user);
    if (!isClientIpAllowed(allowedNetworks, clientIp)) {
      return done(new ForbiddenException('Network not allowed'), false);
    }

    const roles = [...(Array.isArray(payload.identity?.roles) ? payload.identity.roles : [])];
    if (!roles.includes('admin') && payload.identity?._id === '000000000000000000000000') {
      roles.push('admin');
    }

    if (roles.length === 0 && payload.scopes.includes('api')) {
      roles.push('admin');
    }

    return done(null, {
      $ref: !payload.scopes.includes('api') ? Agents.name : Keyrings.name,
      ...payload?.identity,
      roles,
      mfaVerified: !!payload?.mfaVerified,
      mfaVerifiedAt: typeof payload?.mfaVerifiedAt === 'number' ? payload.mfaVerifiedAt : null,
    });
  }
}
