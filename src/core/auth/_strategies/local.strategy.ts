import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AuthService } from '~/core/auth/auth.service';
import { IVerifyOptions, Strategy } from 'passport-local';
import { Request } from 'express';
import { ExcludeAgentType, AgentType } from '~/_common/types/agent.type';
import { omit } from 'radash';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  public constructor(private readonly auth: AuthService) {
    super({
      passReqToCallback: true,
    });
  }

  //TODO: change any
  public async validate(
    _: Request,
    username: string,
    password: string,
    // eslint-disable-next-line
    done: (error: any, user?: Express.User | false, options?: IVerifyOptions) => void,
  ): Promise<void> {
    Logger.verbose(`Try to authenticate user : ${username}`, LocalStrategy.name);
    const user = await this.auth.authenticateWithLocal(username, password);
    // console.log(user);
    if (!user) done(new UnauthorizedException(), false);
    // if (user.state.current !== IdentityState.ACTIVE) done(new ForbiddenException(), false)
    done(null, omit(user.toObject(), ExcludeAgentType) as AgentType);
  }
}
