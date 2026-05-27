import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  Headers,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '~/_common/decorators/public.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ModuleRef } from '@nestjs/core';
import { AuthService } from '~/core/auth/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { buildClientIpDebugPayload } from '~/_common/functions/resolve-client-ip';
import { ReqIdentity } from '~/_common/decorators/params/req-identity.decorator';
import { AgentType } from '~/_common/types/agent.type';
import { hash } from 'crypto';
import { omit } from 'radash';
import { RolesService } from '../roles/roles.service';
import { resolveClientIp } from '~/_common/functions/resolve-client-ip';
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

type LocalLoginBody = {
  username: string;
  password: string;
  otpCode?: string;
  challengeToken?: string;
  body?: {
    username?: string;
    password?: string;
    otpCode?: string;
    challengeToken?: string;
  };
};

type VerifyTotpBody = {
  challengeToken: string;
  otpCode: string;
};

type VerifyWebAuthnBeginBody = {
  challengeToken?: string;
};

type VerifyWebAuthnFinishBody = {
  challengeToken?: string;
  challengeId?: string;
  response: Record<string, unknown>;
};

type StepUpBody = {
  password?: string;
  otpCode?: string;
};

@Public()
@ApiTags('core/auth')
@Controller('auth')
export class AuthController extends AbstractController {
  constructor(
    protected moduleRef: ModuleRef,
    private readonly service: AuthService,
    private readonly rolesService: RolesService,
  ) {
    super();
  }

  private base64urlToUint8Array(value: string): Uint8Array<ArrayBuffer> {
    const normalized = (value || '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const buffer = Buffer.from(`${normalized}${pad}`, 'base64');
    const arrayBuffer = new ArrayBuffer(buffer.byteLength);
    const bytes = new Uint8Array(arrayBuffer);
    bytes.set(buffer);
    return bytes;
  }

  private normalizeWebAuthnCredentialId(value: string): string {
    const credentialId = `${value || ''}`.trim();
    if (!credentialId) return '';

    try {
      const normalized = credentialId.replace(/-/g, '+').replace(/_/g, '/');
      const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
      const decoded = Buffer.from(`${normalized}${pad}`, 'base64').toString('utf8').trim();
      const looksLikeNestedBase64url = /^[A-Za-z0-9_-]+$/.test(decoded) && decoded.length >= 16;
      return looksLikeNestedBase64url ? decoded : credentialId;
    } catch {
      return credentialId;
    }
  }

  private getWebAuthnExpectedOrigin(req?: Request): string {
    const explicitOrigin = (process.env['SESAME_WEBAUTHN_ORIGIN'] || '').trim();
    if (explicitOrigin) return explicitOrigin.replace(/\/+$/, '');

    const requestOrigin = this.getRequestOrigin(req);
    if (requestOrigin) return requestOrigin;

    const fallbackOrigin = this.getForwardedOrigin(req);
    if (fallbackOrigin) return fallbackOrigin;

    const hostOrigin = this.getHostOrigin(req);
    if (hostOrigin) return hostOrigin;

    return '';
  }

  private getWebAuthnRpId(req?: Request): string {
    const env = (process.env['SESAME_WEBAUTHN_RP_ID'] || '').trim();
    if (env) return env;
    const origin = this.getWebAuthnExpectedOrigin(req);
    try {
      return new URL(origin).hostname;
    } catch {
      return '';
    }
  }

  private getRequestOrigin(req?: Request): string {
    const rawOrigin = `${req?.headers?.origin || ''}`.trim();
    if (!rawOrigin) return '';
    try {
      const url = new URL(rawOrigin);
      return `${url.protocol}//${url.host}`;
    } catch {
      return '';
    }
  }

  private getForwardedOrigin(req?: Request): string {
    const forwardedHost = `${req?.headers?.['x-forwarded-host'] || ''}`.split(',')[0]?.trim();
    if (!forwardedHost) return '';

    const forwardedProto =
      `${req?.headers?.['x-forwarded-proto'] || req?.protocol || 'http'}`.split(',')[0]?.trim() || 'http';
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
  }

  private getHostOrigin(req?: Request): string {
    const host = `${req?.headers?.host || ''}`.trim();
    if (!host) return '';
    const protocol = req?.protocol || 'http';
    return `${protocol}://${host}`.replace(/\/+$/, '');
  }

  private getWebAuthnKeys(user: AgentType): any[] {
    const keys = (user as any)?.security?.u2fKey;
    return Array.isArray(keys)
      ? keys.filter((key) => `${key?.credentialId || ''}`.trim() && `${key?.publicKey || ''}`.trim())
      : [];
  }

  private async beginWebAuthnChallenge(
    user: AgentType,
    req: Request,
    context: 'login' | 'step-up',
    challengeId?: string,
  ) {
    const keys = this.getWebAuthnKeys(user);
    if (!keys.length) throw new UnauthorizedException();

    const rpID = this.getWebAuthnRpId(req);
    const expectedOrigin = this.getWebAuthnExpectedOrigin(req);
    if (!rpID || !expectedOrigin) throw new UnauthorizedException();

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: keys.map((key) => ({
        id: this.normalizeWebAuthnCredentialId(`${key.credentialId}`),
        type: 'public-key' as const,
        transports: Array.isArray(key.transports) ? key.transports : [],
      })),
      userVerification: 'preferred',
    });

    const id = challengeId || this.service.createWebAuthnChallengeId();
    await this.service.setWebAuthnChallenge({
      challengeId: id,
      identityId: user._id,
      challenge: options.challenge,
      expectedOrigin,
      rpID,
      context,
    });

    return {
      challengeId: id,
      options,
    };
  }

  private async verifyWebAuthnChallenge(params: {
    challengeId: string;
    response: Record<string, unknown>;
    expectedContext: 'login' | 'step-up';
  }): Promise<AgentType | null> {
    const stored = await this.service.getWebAuthnChallenge(params.challengeId);
    if (!stored || stored.context !== params.expectedContext) return null;

    const user = await this.service.getAgentById(stored.identityId);
    if (!user) return null;

    const responseId = `${params.response?.id || ''}`.trim();
    const key = this.getWebAuthnKeys(user).find(
      (candidate) => this.normalizeWebAuthnCredentialId(`${candidate?.credentialId || ''}`) === responseId,
    );
    if (!key) return null;

    const verification = await verifyAuthenticationResponse({
      response: params.response as any,
      expectedChallenge: stored.challenge,
      expectedOrigin: stored.expectedOrigin,
      expectedRPID: stored.rpID,
      credential: {
        id: this.normalizeWebAuthnCredentialId(`${key.credentialId}`),
        publicKey: this.base64urlToUint8Array(`${key.publicKey}`),
        counter: Number(key.signCount || 0),
        transports: Array.isArray(key.transports) ? key.transports : [],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) return null;

    const newCounter = (verification.authenticationInfo as any)?.newCounter;
    if (Number.isFinite(newCounter)) {
      await this.service.updateWebAuthnSignCount(user._id, `${key.credentialId}`, newCounter);
    }

    await this.service.clearWebAuthnChallenge(params.challengeId);
    return user;
  }

  @Get('debug/client-diagnostic')
  @ApiOperation({ summary: 'Diagnostic IP client (mode debug UI uniquement)' })
  public debugClientNetwork(@Req() req: Request, @Res() res: Response): Response {
    return res.status(HttpStatus.OK).json(buildClientIpDebugPayload(req));
  }

  @Post('local')
  @ApiOperation({ summary: 'Authentification interne utilisateur' })
  public async authenticateWithLocal(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: LocalLoginBody,
  ): Promise<Response> {
    const payload = body?.body && typeof body.body === 'object' ? body.body : body;
    const ip = resolveClientIp(req) ?? null;
    const username = `${payload?.username || ''}`.trim();

    const bruteforce = await this.service.getLocalBruteforceBlock({
      username,
      ip,
    });
    this.logger.debug(
      `[anti-bf] local username=${username || 'N/A'} ip=${ip || 'n/a'} blocked=${bruteforce.blocked} retryAfter=${bruteforce.retryAfterSeconds}s`,
    );
    if (bruteforce.blocked) {
      await this.service.auditAuthAttempt({
        username: username || 'N/A',
        ip,
        result: 'failed',
        reason: 'bruteforce_blocked',
      });
      return res.status(HttpStatus.TOO_MANY_REQUESTS).set('Retry-After', `${bruteforce.retryAfterSeconds}`).json({
        message: 'Too many authentication attempts. Please retry later.',
        retryAfterSeconds: bruteforce.retryAfterSeconds,
      });
    }

    const user = await this.service.authenticateWithLocal(username, payload?.password, ip ?? undefined);
    if (!user) throw new UnauthorizedException();

    const totpEnabled = this.service.isTotpEnabledForUser(user);
    const webAuthnAvailable = this.service.hasWebAuthnKeyForUser(user);
    if (totpEnabled || webAuthnAvailable) {
      const isVerificationRequest =
        typeof payload?.otpCode === 'string' &&
        payload.otpCode.trim().length > 0 &&
        typeof payload?.challengeToken === 'string' &&
        payload.challengeToken.trim().length > 0;
      if (!isVerificationRequest) {
        const challengeToken = await this.service.createMfaChallenge(user);
        return res.status(HttpStatus.OK).json({
          requires2fa: true,
          challengeToken,
          totpAvailable: totpEnabled,
          webAuthnAvailable,
          method: webAuthnAvailable ? 'webauthn' : 'totp',
          methods: [webAuthnAvailable ? 'webauthn' : null, totpEnabled ? 'totp' : null].filter(Boolean),
        });
      }

      if (!totpEnabled) throw new UnauthorizedException();

      const totpBruteforce = await this.service.getTotpBruteforceBlock({
        ip,
        challengeToken: payload.challengeToken.trim(),
      });
      this.logger.debug(
        `[anti-bf] totp username=${user.username || 'N/A'} ip=${ip || 'n/a'} blocked=${totpBruteforce.blocked} retryAfter=${totpBruteforce.retryAfterSeconds}s`,
      );
      if (totpBruteforce.blocked) {
        await this.service.auditAuthAttempt({
          username: user.username,
          ip,
          result: 'failed',
          reason: 'totp_bruteforce_blocked',
          agentId: user._id,
        });
        return res.status(HttpStatus.TOO_MANY_REQUESTS).set('Retry-After', `${totpBruteforce.retryAfterSeconds}`).json({
          message: 'Too many OTP attempts. Please retry later.',
          retryAfterSeconds: totpBruteforce.retryAfterSeconds,
        });
      }

      const verifiedUser = await this.service.verifyTotpChallenge(
        payload.challengeToken.trim(),
        payload.otpCode.trim(),
      );
      if (!verifiedUser || `${verifiedUser._id}` !== `${user._id}`) {
        await this.service.registerTotpBruteforceFailure({
          ip,
          challengeToken: payload.challengeToken.trim(),
          username: user.username,
          agentId: user._id,
        });
        throw new UnauthorizedException();
      }

      await this.service.clearTotpBruteforceState({
        ip,
        challengeToken: payload.challengeToken.trim(),
      });

      const tokens = await this.service.createTokens(verifiedUser, undefined, { mfaVerified: true });
      const uri =
        typeof verifiedUser?.baseURL === 'string' && verifiedUser.baseURL.trim().length > 0
          ? verifiedUser.baseURL.trim()
          : '/';
      return res.status(HttpStatus.OK).json({
        ...tokens,
        uri,
        user: verifiedUser,
      });
    }

    const tokens = await this.service.createTokens(user, undefined, { mfaVerified: false });
    const uri = typeof user?.baseURL === 'string' && user.baseURL.trim().length > 0 ? user.baseURL.trim() : '/';
    return res.status(HttpStatus.OK).json({
      ...tokens,
      uri,
      user,
    });
  }

  @Post('local/preflight')
  @ApiOperation({ summary: 'Préflight MFA (ne crée pas de session)' })
  public async preflightLocal(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: LocalLoginBody,
  ): Promise<Response> {
    const payload = body?.body && typeof body.body === 'object' ? body.body : body;
    const ip = resolveClientIp(req) ?? null;
    const username = `${payload?.username || ''}`.trim();
    const password = `${payload?.password || ''}`;

    const preflight = await this.service.preflightLocalMfa(username, password, ip ?? undefined);
    if (!preflight?.requires2fa) {
      return res.status(HttpStatus.OK).json({ requires2fa: false });
    }

    return res.status(HttpStatus.OK).json({
      requires2fa: true,
      challengeToken: preflight.challengeToken,
      totpAvailable: preflight.totpAvailable,
      webAuthnAvailable: preflight.webAuthnAvailable,
      method: preflight.webAuthnAvailable ? 'webauthn' : 'totp',
      methods: [preflight.webAuthnAvailable ? 'webauthn' : null, preflight.totpAvailable ? 'totp' : null].filter(
        Boolean,
      ),
    });
  }

  @Post('local/2fa/webauthn/begin')
  @ApiOperation({ summary: 'Initialisation WebAuthn pour finaliser la connexion MFA' })
  public async beginLocal2faWebAuthn(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: VerifyWebAuthnBeginBody,
  ): Promise<Response> {
    const challengeToken = `${body?.challengeToken || ''}`.trim();
    const user = await this.service.getMfaChallengeUser(challengeToken);
    if (!user) throw new UnauthorizedException();

    const { options } = await this.beginWebAuthnChallenge(user, req, 'login', challengeToken);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: options,
    });
  }

  @Post('local/2fa/webauthn/finish')
  @ApiOperation({ summary: 'Validation WebAuthn pour finaliser la connexion MFA' })
  public async finishLocal2faWebAuthn(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: VerifyWebAuthnFinishBody,
  ): Promise<Response> {
    const ip = resolveClientIp(req) ?? null;
    const challengeToken = `${body?.challengeToken || body?.challengeId || ''}`.trim();
    const user = await this.verifyWebAuthnChallenge({
      challengeId: challengeToken,
      response: body?.response || {},
      expectedContext: 'login',
    });
    if (!user) {
      await this.service.registerTotpBruteforceFailure({
        ip,
        challengeToken,
      });
      throw new UnauthorizedException();
    }

    await this.service.clearTotpBruteforceState({
      ip,
      challengeToken,
    });
    await this.service.clearMfaChallenge(challengeToken);

    const tokens = await this.service.createTokens(user, undefined, { mfaVerified: true });
    const uri = typeof user?.baseURL === 'string' && user.baseURL.trim().length > 0 ? user.baseURL.trim() : '/';
    return res.status(HttpStatus.OK).json({
      ...tokens,
      uri,
      user,
    });
  }

  @Post('local/2fa/verify')
  @ApiOperation({ summary: 'Validation du code TOTP pour finaliser la connexion' })
  public async verifyLocal2fa(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: VerifyTotpBody,
  ): Promise<Response> {
    const ip = resolveClientIp(req) ?? null;
    const challengeToken = `${body?.challengeToken || ''}`.trim();

    const totpBruteforce = await this.service.getTotpBruteforceBlock({
      ip,
      challengeToken,
    });
    this.logger.debug(
      `[anti-bf] totp-verify ip=${ip || 'n/a'} tokenPrefix=${challengeToken.slice(0, 8) || 'n/a'} blocked=${totpBruteforce.blocked} retryAfter=${totpBruteforce.retryAfterSeconds}s`,
    );
    if (totpBruteforce.blocked) {
      await this.service.auditAuthAttempt({
        username: 'N/A',
        ip,
        result: 'failed',
        reason: 'totp_bruteforce_blocked',
      });
      return res.status(HttpStatus.TOO_MANY_REQUESTS).set('Retry-After', `${totpBruteforce.retryAfterSeconds}`).json({
        message: 'Too many OTP attempts. Please retry later.',
        retryAfterSeconds: totpBruteforce.retryAfterSeconds,
      });
    }

    const user = await this.service.verifyTotpChallenge(challengeToken, `${body?.otpCode || ''}`.trim());
    if (!user) {
      await this.service.registerTotpBruteforceFailure({
        ip,
        challengeToken,
      });
      throw new UnauthorizedException();
    }

    await this.service.clearTotpBruteforceState({
      ip,
      challengeToken,
    });
    const tokens = await this.service.createTokens(user, undefined, { mfaVerified: true });
    const uri = typeof user?.baseURL === 'string' && user.baseURL.trim().length > 0 ? user.baseURL.trim() : '/';
    return res.status(HttpStatus.OK).json({
      ...tokens,
      uri,
      user,
    });
  }

  @Get('session')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Récupération de la session en cours' })
  public async session(@Res() res: Response, @ReqIdentity() identity: AgentType): Promise<Response> {
    this.logger.debug(`Session request for ${identity._id} (${identity.email})`);
    const user = await this.service.getSessionData(identity);
    this.logger.debug(`Session data delivered for ${identity._id} (${identity.email}) with ${JSON.stringify(user)}`);

    const ac = await this.rolesService.getRolesBuilder();
    // console.log('ac.getGrants()', ac.getGrants())

    const sseSeed = `${user?.security?.secretKey || user?._id || ''}`;
    const totpEnabled = this.service.isTotpEnabledForUser(user as any);
    const webAuthnEnabled = this.service.hasWebAuthnKeyForUser(user as any);
    return res.status(HttpStatus.OK).json({
      user: {
        ...omit(user, ['security', 'metadata']),
        mfaEnabled: totpEnabled || webAuthnEnabled,
        totpEnabled,
        webAuthnEnabled,
        sseToken: hash('sha256', sseSeed),
        access: ac.getGrants(),
      },
    });
  }

  @Post('mfa/step-up')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Élévation de session (MFA / confirmation mot de passe)' })
  public async stepUpMfa(
    @Res() res: Response,
    @Req() req: Request,
    @ReqIdentity() identity: AgentType,
    @Body() body: StepUpBody,
  ): Promise<Response> {
    const user = await this.service.stepUpMfa({
      identity,
      password: typeof body?.password === 'string' ? body.password : undefined,
      otpCode: typeof body?.otpCode === 'string' ? body.otpCode : undefined,
      ip: resolveClientIp(req),
    });
    if (!user) throw new UnauthorizedException();

    const tokens = await this.service.createTokens(user, undefined, { mfaVerified: true });
    return res.status(HttpStatus.OK).json(tokens);
  }

  @Post('mfa/webauthn/begin')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Initialisation WebAuthn pour élévation de session' })
  public async beginWebAuthnStepUp(
    @Res() res: Response,
    @Req() req: Request,
    @ReqIdentity() identity: AgentType,
  ): Promise<Response> {
    const user = await this.service.getAgentById(identity._id);
    if (!user) throw new UnauthorizedException();

    const { challengeId, options } = await this.beginWebAuthnChallenge(user, req, 'step-up');
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: {
        challengeId,
        options,
      },
    });
  }

  @Post('mfa/webauthn/finish')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Validation WebAuthn pour élévation de session' })
  public async finishWebAuthnStepUp(
    @Res() res: Response,
    @ReqIdentity() identity: AgentType,
    @Body() body: VerifyWebAuthnFinishBody,
  ): Promise<Response> {
    const challengeId = `${body?.challengeId || ''}`.trim();
    const user = await this.verifyWebAuthnChallenge({
      challengeId,
      response: body?.response || {},
      expectedContext: 'step-up',
    });
    if (!user || `${user._id}` !== `${identity._id}`) throw new UnauthorizedException();

    const tokens = await this.service.createTokens(user, undefined, { mfaVerified: true });
    return res.status(HttpStatus.OK).json(tokens);
  }

  //TODO: change any
  @Post('refresh')
  @ApiOperation({ summary: "Récupère un nouveau jeton d'authentification" })
  public async refresh(@Res() res: Response, @Body() body: { refresh_token: string }): Promise<Response> {
    const [agents, tokens] = await this.service.renewTokens(body.refresh_token);
    return res.status(HttpStatus.OK).json({
      ...tokens,
      sseToken: hash('sha256', agents.security.secretKey),
    });
  }

  @Post('logout')
  @ApiOperation({ summary: "Supprime le jeton d'authentification utilisateur" })
  public async logout(@Res() res: Response, @Headers('Authorization') jwt: string): Promise<Response> {
    await this.service.clearSession(jwt.replace(/^Bearer\s/, ''));
    return res.status(HttpStatus.OK).send();
  }
}
