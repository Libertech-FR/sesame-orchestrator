import { ForbiddenException, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import { ModuleRef } from '@nestjs/core';
import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { verify as argon2Verify } from 'argon2';
import { Agents } from '~/core/agents/_schemas/agents.schema';
import { AgentsService } from '~/core/agents/agents.service';
import { AgentType } from '~/_common/types/agent.type';
import { omit } from 'radash';
import { JwtPayload } from 'jsonwebtoken';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService extends AbstractService implements OnModuleInit {
  protected readonly DEV_TOKEN_PATH = '.dev-token.json';
  protected readonly TOKEN_PATH_SEPARATOR = ':';

  protected readonly ACCESS_TOKEN_PREFIX = 'access_token';
  protected readonly REFRESH_TOKEN_PREFIX = 'refresh_token';

  protected ACCESS_TOKEN_EXPIRES_IN = 5 * 60;
  protected REFRESH_TOKEN_EXPIRES_IN = 3600 * 24 * 7;

  public constructor(
    protected moduleRef: ModuleRef,
    protected readonly agentsService: AgentsService,
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super();
  }

  onModuleInit(): any {
    Logger.log('Auth service initialized');
  }

  public async authenticateWithLocal(username: string, password: string): Promise<Agents | null> {
    try {
      const user = await this.agentsService.findOne<Agents>({ username });
      console.log(user);
      if (user && (await argon2Verify(user.password, password))) {
        return user;
      }
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  // eslint-disable-next-line
  public async verifyIdentity(payload: any & { identity: AgentType }): Promise<any> {
    try {
      if (payload.scopes.includes('offline')) {
        return payload.identity;
      }
      const identity = await this.redis.get([this.ACCESS_TOKEN_PREFIX, payload.jti].join(':'));
      if (identity) {
        return JSON.parse(identity);
      }
    } finally {
    }
    return null;
  }

  public async createTokens(
    identity: AgentType,
    refresh_token?: string | false,
    options?: any,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
  }> {
    const scopes = ['teaket'];
    if (refresh_token === false) scopes.push('offline');
    const jwtid = `${identity._id}_${randomBytes(16).toString('hex')}`;
    const access_token = this.jwtService.sign(
      { identity, scopes },
      {
        expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        jwtid,
        subject: `${identity._id}`,
        ...options,
      },
    );
    if (refresh_token === false) return { access_token };
    if (!refresh_token) {
      refresh_token = [`${identity._id}`, randomBytes(64).toString('hex')].join(this.TOKEN_PATH_SEPARATOR);
      await this.redis.set(
        [this.REFRESH_TOKEN_PREFIX, refresh_token].join(this.TOKEN_PATH_SEPARATOR),
        JSON.stringify({
          identityId: identity._id,
        }),
      );
    }
    await this.redis.expire(
      [this.REFRESH_TOKEN_PREFIX, refresh_token].join(this.TOKEN_PATH_SEPARATOR),
      this.REFRESH_TOKEN_EXPIRES_IN,
    );
    await this.redis.set(
      [this.ACCESS_TOKEN_PREFIX, jwtid].join(this.TOKEN_PATH_SEPARATOR),
      JSON.stringify({
        identity,
        refresh_token,
      }),
      'EX',
      this.ACCESS_TOKEN_EXPIRES_IN,
    );
    return {
      access_token,
      refresh_token,
    };
  }

  //TODO: change any
  public async getSessionData(identity: AgentType): Promise<AgentType> {
    // const entity = await this.agentsService.findOne<Agents>(
    //   { _id: identity.entityId },
    //   {
    //     projection: {
    //       metadata: 0,
    //     },
    //   },
    // )
    return {
      ...identity,
      // entity,
    };
  }

  public async renewTokens(refresh_token: string): Promise<{
    access_token: string;
    refresh_token?: string;
  }> {
    const data = await this.redis.get([this.REFRESH_TOKEN_PREFIX, refresh_token].join(this.TOKEN_PATH_SEPARATOR));
    if (!data) throw new UnauthorizedException();
    const { identityId } = JSON.parse(data);
    const identity = await this.agentsService.findOne({ _id: identityId });
    if (!identity) throw new ForbiddenException();
    return this.createTokens(omit(identity.toObject(), ['password']), refresh_token);
  }

  public async clearSession(jwt: string): Promise<void> {
    try {
      const data = this.jwtService.decode(jwt) as JwtPayload;
      if (!data) return null;
      const { jti } = data;
      const infos = await this.redis.get([this.ACCESS_TOKEN_PREFIX, jti].join(this.TOKEN_PATH_SEPARATOR));
      await this.redis.del([this.ACCESS_TOKEN_PREFIX, jti].join(this.TOKEN_PATH_SEPARATOR));
      if (infos) {
        const { refresh_token } = JSON.parse(infos);
        await this.redis.del([this.REFRESH_TOKEN_PREFIX, refresh_token].join(this.TOKEN_PATH_SEPARATOR));
      }
    } finally {
    }
  }
}
