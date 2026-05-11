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

    if (this.service.isTotpEnabledForUser(user)) {
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
          method: 'totp',
        });
      }

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
      method: 'totp',
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
    const mfaEnabled = this.service.isTotpEnabledForUser(user as any);
    return res.status(HttpStatus.OK).json({
      user: {
        ...omit(user, ['security', 'metadata']),
        mfaEnabled,
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
