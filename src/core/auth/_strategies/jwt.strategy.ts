import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { AgentType } from '~/_common/types/agent.type';
import { JwtPayload } from 'jsonwebtoken';

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
    _: Request,
    payload: JwtPayload & { identity: AgentType },
    done: VerifiedCallback,
  ): Promise<void> {
    this.logger.verbose(`Atempt to authenticate with JTI: <${payload.jti}>`);
    if (!payload?.identity) return done(new UnauthorizedException(), false);
    const user = await this.auth.verifyIdentity(payload);

    if (!user) return done(new ForbiddenException(), false);
    return done(null, payload?.identity);
  }
}
