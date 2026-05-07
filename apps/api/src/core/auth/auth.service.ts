import { ForbiddenException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import { ModuleRef } from '@nestjs/core';
import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { verify as argon2Verify } from 'argon2';
import { Agents } from '~/core/agents/_schemas/agents.schema';
import { AgentsService } from '~/core/agents/agents.service';
import { AgentType } from '~/_common/types/agent.type';
import { omit, pascal, pick } from 'radash';
import { JwtPayload } from 'jsonwebtoken';
import { JwtService } from '@nestjs/jwt';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ConsoleSession } from '~/_common/data/console-session';
import { KeyringsService } from '../keyrings/keyrings.service';
import { ApiSession } from '~/_common/data/api-session';
import { AuditsService } from '~/core/audits/audits.service';
import { Types } from 'mongoose';
import ipRangeCheck from 'ip-range-check';
import { AgentState } from '~/core/agents/_enum/agent-state.enum';

import * as speakeasy from 'speakeasy';

@Injectable()
export class AuthService extends AbstractService implements OnModuleInit {
  protected readonly DEV_TOKEN_PATH = '.dev-token.json';
  protected readonly TOKEN_PATH_SEPARATOR = ':';

  protected readonly ACCESS_TOKEN_PREFIX = 'access_token';
  protected readonly REFRESH_TOKEN_PREFIX = 'refresh_token';
  protected readonly MFA_CHALLENGE_PREFIX = 'mfa_challenge';

  protected ACCESS_TOKEN_EXPIRES_IN = 5 * 60;
  protected REFRESH_TOKEN_EXPIRES_IN = 3600 * 24 * 7;
  protected MFA_CHALLENGE_EXPIRES_IN = 5 * 60;

  public constructor(
    protected moduleRef: ModuleRef,
    protected readonly agentsService: AgentsService,
    protected readonly keyringsService: KeyringsService,
    protected readonly auditsService: AuditsService,
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super();
  }

  public async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn('DEV MODE ENABLED !');
      const devTokenPath = resolve(process.cwd(), this.DEV_TOKEN_PATH);
      if (existsSync(devTokenPath)) {
        try {
          const data = JSON.parse(readFileSync(devTokenPath, 'utf-8'));
          if (data.access_token) {
            this.logger.log(`TOKEN ALREADY EXIST : <${data.access_token}>`);
            return;
          }
        } catch (e) {
          this.logger.error(`TOKEN FILE CORRUPTED ! REGENERATING...`);
        }
      }
      const { access_token } = await this.createTokens(new ConsoleSession(), false, {
        expiresIn: '1y',
        scopes: ['offline', 'api'],
      });
      writeFileSync(
        devTokenPath,
        JSON.stringify({
          access_token,
        }),
      );

      this.logger.log(`NEW TOKEN CREATED : <${access_token}>`);
    }
  }

  public async authenticateWithLocal(username: string, password: string, clientIp?: string): Promise<Agents | null> {
    const ip = this.normalizeClientIp(clientIp);
    let user: Agents | null = null;
    this.logger.debug(`[local-auth] attempt username=${username} ip=${ip || 'n/a'}`);
    try {
      user = await this.agentsService.findOne<Agents>({ username });
      if (!user || !(await argon2Verify(user.password, password))) {
        this.logger.warn(`[local-auth] invalid credentials username=${username}`);
        await this.auditAuthenticationAttempt({
          username,
          ip,
          result: 'failed',
          reason: 'invalid_credentials',
          agentId: user?._id,
        });
        return null;
      }

      if (user?.state?.current !== AgentState.ACTIVE) {
        this.logger.warn(`[local-auth] inactive agent username=${username} state=${user?.state?.current}`);
        await this.auditAuthenticationAttempt({
          username,
          ip,
          result: 'failed',
          reason: 'agent_not_active',
          agentId: user?._id,
        });
        return null;
      }

      if (!this.isClientIpAllowed(user?.security?.allowedNetworks, ip)) {
        this.logger.warn(`[local-auth] ip not allowed username=${username} ip=${ip || 'n/a'}`);
        await this.auditAuthenticationAttempt({
          username,
          ip,
          result: 'failed',
          reason: ip ? 'network_not_allowed' : 'ip_unavailable',
          agentId: user?._id,
        });
        return null;
      }

      await this.auditAuthenticationAttempt({
        username,
        ip,
        result: 'success',
        reason: 'authenticated',
        agentId: user?._id,
      });

      this.logger.debug(`[local-auth] success username=${username} userId=${user?._id}`);
      return user;
    } catch (e) {
      this.logger.error(`Local authentication failed for ${username}`, e instanceof Error ? e.stack : undefined);
      await this.auditAuthenticationAttempt({
        username,
        ip,
        result: 'failed',
        reason: 'internal_error',
        agentId: user?._id,
      });
      return null;
    }
  }

  public isTotpEnabledForUser(user: Pick<Agents, 'security'>): boolean {
    const otpKey = `${user?.security?.otpKey || ''}`.trim().replace(/\s+/g, '').toUpperCase();
    if (!otpKey) return false;
    // Treat MFA as enabled only when the stored key looks like a valid base32 TOTP secret.
    const enabled = /^[A-Z2-7]+=*$/.test(otpKey) && otpKey.length >= 16;
    this.logger.debug(`[mfa] totp enabled=${enabled} otpLength=${otpKey.length}`);
    return enabled;
  }

  public async createMfaChallenge(identity: Pick<Agents, '_id' | 'username'>): Promise<string> {
    const challengeToken = randomBytes(48).toString('hex');
    await this.redis.set(
      [this.MFA_CHALLENGE_PREFIX, challengeToken].join(this.TOKEN_PATH_SEPARATOR),
      JSON.stringify({
        identityId: `${identity._id}`,
        username: identity.username,
      }),
      'EX',
      this.MFA_CHALLENGE_EXPIRES_IN,
    );
    this.logger.debug(`[mfa] challenge created userId=${identity._id} username=${identity.username}`);
    return challengeToken;
  }

  public async verifyTotpChallenge(challengeToken: string, otpCode: string): Promise<Agents | null> {
    const challengeKey = [this.MFA_CHALLENGE_PREFIX, challengeToken].join(this.TOKEN_PATH_SEPARATOR);
    const challengeRaw = await this.redis.get(challengeKey);
    if (!challengeRaw) {
      this.logger.warn(`[mfa] challenge missing/expired tokenPrefix=${challengeToken.slice(0, 8)}`);
      return null;
    }

    const challenge = JSON.parse(challengeRaw) as { identityId: string; username?: string };
    const identity = await this.agentsService.findOne<Agents>({ _id: challenge.identityId });
    if (!identity) {
      await this.redis.del(challengeKey);
      this.logger.warn(`[mfa] challenge identity not found identityId=${challenge.identityId}`);
      return null;
    }

    const otpKey = `${identity?.security?.otpKey || ''}`.trim().replace(/\s+/g, '').toUpperCase();
    if (!otpKey) {
      await this.redis.del(challengeKey);
      this.logger.warn(`[mfa] otp key missing userId=${identity._id}`);
      return null;
    }

    const isValid = speakeasy.totp.verify({
      secret: otpKey,
      token: otpCode,
      encoding: 'base32',
      window: 1,
    });
    await this.auditAuthenticationAttempt({
      username: identity.username,
      ip: null,
      result: isValid ? 'success' : 'failed',
      reason: isValid ? 'totp_verified' : 'totp_invalid',
      agentId: identity?._id,
    });

    if (!isValid) {
      this.logger.warn(`[mfa] invalid totp userId=${identity._id}`);
      return null;
    }

    await this.redis.del(challengeKey);
    this.logger.debug(`[mfa] totp verified userId=${identity._id}`);
    return identity;
  }

  public async stepUpMfa(params: {
    identity: AgentType;
    password?: string;
    otpCode?: string;
    ip?: string | null;
  }): Promise<Agents | null> {
    const identityId = `${params?.identity?._id || ''}`.trim();
    if (!identityId) return null;

    const user = await this.agentsService.findOne<Agents>({ _id: identityId });
    if (!user) return null;

    if (this.isTotpEnabledForUser(user)) {
      const otpCode = `${params?.otpCode || ''}`.trim();
      if (!otpCode) return null;

      const otpKey = `${user?.security?.otpKey || ''}`.trim().replace(/\s+/g, '').toUpperCase();
      if (!otpKey) return null;

      const isValid = speakeasy.totp.verify({
        secret: otpKey,
        token: otpCode,
        encoding: 'base32',
        window: 1,
      });

      await this.auditAuthenticationAttempt({
        username: user.username,
        ip: params?.ip ?? null,
        result: isValid ? 'success' : 'failed',
        reason: isValid ? 'stepup_totp_verified' : 'stepup_totp_invalid',
        agentId: user?._id,
      });

      if (!isValid) return null;
      return user;
    }

    const password = `${params?.password || ''}`;
    if (!password.trim()) return null;

    const reauthed = await this.authenticateWithLocal(
      user.username,
      password,
      typeof params?.ip === 'string' ? params.ip : undefined,
    );
    if (!reauthed || `${reauthed._id}` !== `${user._id}`) return null;

    await this.auditAuthenticationAttempt({
      username: user.username,
      ip: params?.ip ?? null,
      result: 'success',
      reason: 'stepup_password_verified',
      agentId: user?._id,
    });

    return user;
  }

  protected normalizeClientIp(clientIp?: string): string | null {
    if (!clientIp || typeof clientIp !== 'string') return null;
    const value = clientIp.trim();
    if (!value) return null;
    if (value.startsWith('::ffff:')) return value.slice(7);
    return value;
  }

  protected isClientIpAllowed(allowedNetworks?: string[] | null, clientIp?: string | null): boolean {
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

  protected async auditAuthenticationAttempt(params: {
    username: string;
    ip: string | null;
    result: 'success' | 'failed';
    reason: string;
    agentId?: Types.ObjectId | string;
  }): Promise<void> {
    try {
      await this.auditsService.createAuthenticationAudit({
        username: params.username,
        ip: params.ip,
        result: params.result,
        reason: params.reason,
        agentId: params.agentId,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write authentication audit for ${params.username}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // eslint-disable-next-line
  public async verifyIdentity(payload: any & { identity: AgentType & { token: string } }): Promise<any> {
    // console.log('payload', payload);
    if (payload.scopes.includes('offline')) {
      this.logger.debug(`[jwt-verify] offline accepted identityId=${payload?.identity?._id}`);
      return payload.identity;
    }
    if (payload.scopes.includes('api')) {
      try {
        const identity = await this.keyringsService.findOne({
          _id: payload.identity._id,
          token: payload.identity.token,
        });
        if (identity) {
          this.logger.debug(`[jwt-verify] api accepted identityId=${payload?.identity?._id}`);
          return identity.toObject();
        }
      } catch (e) {}
      this.logger.warn(`[jwt-verify] api rejected identityId=${payload?.identity?._id}`);
      return null;
    }
    try {
      const identity = await this.redis.get([this.ACCESS_TOKEN_PREFIX, payload.jti].join(':'));
      if (identity) {
        const data = JSON.parse(identity);
        // console.log('data', data);
        const success = await this.agentsService.model.countDocuments({
          _id: payload.identity._id,
          'security.secretKey': data.identity?.security?.secretKey,
        });

        if (success) {
          this.logger.debug(`[jwt-verify] session accepted jti=${payload.jti} identityId=${payload?.identity?._id}`);
          return data;
        }

        const legacySuccess = await this.agentsService.model.countDocuments({
          _id: payload.identity._id,
        });
        if (legacySuccess) {
          this.logger.warn(
            `[jwt-verify] legacy fallback accepted jti=${payload.jti} identityId=${payload?.identity?._id}`,
          );
        } else {
          this.logger.warn(`[jwt-verify] session rejected jti=${payload.jti} identityId=${payload?.identity?._id}`);
        }
        return legacySuccess ? data : null;
      }
      this.logger.warn(`[jwt-verify] redis session missing jti=${payload.jti}`);
    } catch (e) {
      this.logger.warn('Invalid jwt session', e);
    }
    return null;
  }

  public async createTokens(
    identity: AgentType & any,
    refresh_token?: string | false,
    options?: any,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
  }> {
    const scopes = ['sesame'];
    if (options?.scopes) scopes.push(...options.scopes);
    const normalizedIdentity = typeof identity?.toObject === 'function' ? identity.toObject() : identity;
    const jwtid = `${identity._id}_${randomBytes(16).toString('hex')}`;
    const mfaVerified = !!options?.mfaVerified;
    const access_token = this.jwtService.sign(
      { identity: pick(normalizedIdentity, ['_id', 'username', 'email', 'token', 'roles']), scopes, mfaVerified },
      {
        expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        jwtid,
        subject: `${identity._id}`,
        ...omit(options, ['scopes', 'mfaVerified']),
      },
    );
    this.logger.debug(
      `[token] access generated identityId=${identity?._id} mfaVerified=${mfaVerified} scopes=${scopes.join(',')}`,
    );
    if (refresh_token === false) return { access_token };
    if (!refresh_token) {
      refresh_token = [`${identity._id}`, randomBytes(64).toString('hex')].join(this.TOKEN_PATH_SEPARATOR);
      await this.redis.set(
        [this.REFRESH_TOKEN_PREFIX, refresh_token].join(this.TOKEN_PATH_SEPARATOR),
        JSON.stringify({
          identityId: identity._id,
          mfaVerified,
        }),
      );
    }
    await this.redis.expire(
      [this.REFRESH_TOKEN_PREFIX, refresh_token].join(this.TOKEN_PATH_SEPARATOR),
      this.REFRESH_TOKEN_EXPIRES_IN,
    );
    const userIdentity = await this.agentsService.findOne<Agents>({ _id: identity._id });
    await this.redis.set(
      [this.ACCESS_TOKEN_PREFIX, jwtid].join(this.TOKEN_PATH_SEPARATOR),
      JSON.stringify({
        identity: userIdentity.toJSON(),
        refresh_token,
        mfaVerified,
      }),
      'EX',
      this.ACCESS_TOKEN_EXPIRES_IN,
    );
    return {
      access_token,
      refresh_token,
    };
  }

  public async getSessionData(identity: AgentType): Promise<AgentType> {
    let entity = await this.agentsService.findOne<Agents>(
      { _id: identity._id },
      {
        metadata: 0,
        password: 0,
      },
    );
    if (!entity?.security?.secretKey) {
      const regeneratedSecretKey = randomBytes(32).toString('hex');
      await this.agentsService.update(identity._id, {
        $set: {
          'security.secretKey': regeneratedSecretKey,
        },
      });
      entity = await this.agentsService.findOne<Agents>(
        { _id: identity._id },
        {
          metadata: 0,
          password: 0,
        },
      );
      this.logger.warn(`[session] regenerated missing security.secretKey for identityId=${identity._id}`);
    }
    return {
      ...omit(entity.toJSON(), ['password']),
    };
  }

  public async renewTokens(refresh_token: string): Promise<
    [
      Agents,
      {
        access_token: string;
        refresh_token?: string;
      },
    ]
  > {
    const data = await this.redis.get([this.REFRESH_TOKEN_PREFIX, refresh_token].join(this.TOKEN_PATH_SEPARATOR));
    if (!data) throw new UnauthorizedException();
    const { identityId, mfaVerified } = JSON.parse(data);
    const identity = await this.agentsService.findOne<Agents>({ _id: identityId });
    if (!identity) throw new ForbiddenException();
    return [identity, await this.createTokens(omit(identity.toObject(), ['password']), refresh_token, { mfaVerified })];
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
