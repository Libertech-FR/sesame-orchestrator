import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { FilterOptions, FilterSchema, SearchFilterOptions, SearchFilterSchema } from '~/_common/restools';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator';
import { ApiDeletedResponseDecorator } from '~/_common/decorators/api-deleted-response.decorator';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { ApiUpdateDecorator } from '~/_common/decorators/api-update.decorator';
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { AgentsCreateDto, AgentsDto, AgentsSelfUpdateDto, AgentsUpdateDto } from '~/core/agents/_dto/agents.dto';
import { AgentsService } from './agents.service';
import { Agents } from '~/core/agents/_schemas/agents.schema';
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types';
import { UseRoles } from '~/_common/decorators/use-roles.decorator';
import { RequireMfa } from '~/_common/decorators/require-mfa.decorator';
import { ReqIdentity } from '~/_common/decorators/params/req-identity.decorator';
import { AgentType } from '~/_common/types/agent.type';
import { verify as argon2Verify } from 'argon2';
import { randomBytes } from 'crypto';
import * as speakeasy from 'speakeasy';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { WebAuthnRegisterBeginDto, WebAuthnRegisterFinishDto } from '~/core/agents/_dto/webauthn.dto';
import { PasswdadmService } from '~/settings/passwdadm.service';
import { assertAgentPasswordNotReused, nextAgentOldPasswords } from '~/core/agents/_utils/agent-password-history';

type TotpConfirmBody = {
  secret: string;
  otpCode: string;
};

/**
 * Contrôleur pour la gestion des agents
 *
 * Ce contrôleur fournit les endpoints REST pour gérer les agents du système,
 * incluant la création, la recherche, la lecture, la mise à jour et la suppression.
 *
 * @class AgentsController
 * @extends {AbstractController}
 */
@ApiTags('core/agents')
@Controller('agents')
export class AgentsController extends AbstractController {
  private readonly WEBAUTHN_REG_PREFIX = 'webauthn_reg';
  private readonly WEBAUTHN_REG_TTL_SECONDS = 5 * 60;

  protected sanitizeAgentPayload<T = any>(payload: T, options?: { includeOtpKey?: boolean }): T {
    if (!payload || typeof payload !== 'object') return payload;

    if (Array.isArray(payload)) {
      return payload.map((item) => this.sanitizeAgentPayload(item)) as T;
    }

    const source = typeof (payload as any).toObject === 'function' ? (payload as any).toObject() : payload;
    const cloned: Record<string, any> = { ...(source as Record<string, any>) };

    delete cloned.password;
    if (cloned.security && typeof cloned.security === 'object') {
      cloned.security = { ...cloned.security };
      delete cloned.security.oldPasswords;
      if (Array.isArray(cloned.security.u2fKey)) {
        cloned.security.u2fKey = cloned.security.u2fKey.map((k: any) => ({
          credentialId: k?.credentialId,
          transports: k?.transports,
          createdAt: k?.createdAt,
          name: k?.name,
          signCount: k?.signCount,
        }));
      }
      if (!options?.includeOtpKey) {
        delete cloned.security.otpKey;
      }
      delete cloned.security.secretKey;
    }
    if (cloned.value && typeof cloned.value === 'object') {
      cloned.value = this.sanitizeAgentPayload(cloned.value);
    }

    return cloned as T;
  }

  /**
   * Projection des champs retournés pour les opérations de recherche
   *
   * Définit les propriétés de l'agent qui seront incluses dans les réponses
   * des requêtes de recherche et de liste.
   *
   * @protected
   * @static
   * @readonly
   * @type {PartialProjectionType<AgentsDto>}
   */
  protected static readonly projection: PartialProjectionType<AgentsDto> = {
    // entityId: 1,
    username: 1,
    displayName: 1,
    email: 1,
    state: 1,
    hidden: 1,
  };

  protected static readonly searchFields: PartialProjectionType<any> = {
    username: 1,
    displayName: 1,
    email: 1,
  };

  /**
   * Constructeur du contrôleur agents
   *
   * @param {AgentsService} _service - Service de gestion des agents injecté par dépendance
   */
  public constructor(
    private readonly _service: AgentsService,
    private readonly configService: ConfigService,
    private readonly passwdadmService: PasswdadmService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super();
  }

  private base64urlToBuffer(value: string): Buffer {
    const normalized = (value || '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return Buffer.from(`${normalized}${pad}`, 'base64');
  }

  private bufferToBase64url(buf: Uint8Array | Buffer | string): string {
    if (typeof buf === 'string') return `${buf}`.trim();
    return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private normalizeWebAuthnCredentialId(value: string): string {
    const credentialId = `${value || ''}`.trim();
    if (!credentialId) return '';

    try {
      const decoded = this.base64urlToBuffer(credentialId).toString('utf8').trim();
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

    const configuredOrigin = (this.configService.get<string>('frontPwd.url') || '').trim();
    return configuredOrigin.replace(/\/+$/, '');
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

  private getWebAuthnRpName(): string {
    return (process.env['SESAME_WEBAUTHN_RP_NAME'] || 'Sesame').trim() || 'Sesame';
  }

  /**
   * Crée un nouvel agent
   *
   * Endpoint POST permettant de créer un nouvel agent dans le système.
   *
   * @async
   * @param {Response} res - Objet de réponse Express
   * @param {AgentsCreateDto} body - Données de création de l'agent
   * @returns {Promise<Response>} Réponse HTTP avec l'agent créé et le code 201
   * @throws {BadRequestException} Si les données fournies sont invalides
   */
  @Post()
  @RequireMfa()
  @UseRoles({
    resource: 'core/agents',
    action: AC_ACTIONS.CREATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiCreateDecorator(AgentsCreateDto, AgentsDto)
  public async create(@Res() res: Response, @Body() body: AgentsCreateDto): Promise<Response> {
    const data = await this._service.create(body);
    return res.status(HttpStatus.CREATED).json({
      statusCode: HttpStatus.CREATED,
      data: this.sanitizeAgentPayload(data),
    });
  }

  /**
   * Recherche et liste les agents avec pagination
   *
   * Endpoint GET permettant de rechercher et filtrer les agents avec support
   * de la pagination, du tri et des filtres avancés.
   *
   * @async
   * @param {Response} res - Objet de réponse Express
   * @param {FilterSchema} searchFilterSchema - Schéma de filtres de recherche
   * @param {FilterOptions} searchFilterOptions - Options de pagination et tri
   * @returns {Promise<Response>} Réponse HTTP avec la liste paginée des agents et le total
   * @todo Implémenter la recherche arborescente par parentId
   */
  @Get()
  @UseRoles({
    resource: '/core/agents',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiPaginatedDecorator(PickProjectionHelper(AgentsDto, AgentsController.projection))
  public async search(
    @Res() res: Response,
    @Query('search') search: string,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response> {
    const searchFilter = {};

    if (search && search.trim().length > 0) {
      const searchRequest = {};
      searchRequest['$or'] = Object.keys(AgentsController.searchFields)
        .map((key) => {
          return { [key]: { $regex: `^${search}`, $options: 'i' } };
        })
        .filter((item) => item !== undefined);
      searchFilter['$and'] = [searchRequest];
      searchFilter['$and'].push(searchFilterSchema);
    } else {
      Object.assign(searchFilter, searchFilterSchema);
    }

    const [data, total] = await this._service.findAndCount(
      searchFilter,
      AgentsController.projection,
      searchFilterOptions,
    );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    });
  }

  /**
   * Récupère un agent par son identifiant
   *
   * Endpoint GET permettant de récupérer les détails complets d'un agent spécifique.
   * Les champs sensibles (password, security) sont exclus de la réponse.
   *
   * @async
   * @param {Types.ObjectId} _id - Identifiant MongoDB de l'agent (24 caractères hexadécimaux)
   * @param {Response} res - Objet de réponse Express
   * @returns {Promise<Response>} Réponse HTTP avec les données de l'agent
   * @throws {NotFoundException} Si l'agent n'est pas trouvé
   */
  @Get(':_id([0-9a-fA-F]{24})')
  @UseRoles({
    resource: '/core/agents',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiReadResponseDecorator(AgentsDto)
  public async read(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.findById(_id, {
      password: 0,
      'security.oldPasswords': 0,
    });
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this.sanitizeAgentPayload(data, { includeOtpKey: true }),
    });
  }

  @Get('me')
  @ApiReadResponseDecorator(AgentsDto)
  public async readSelf(@ReqIdentity() identity: AgentType, @Res() res: Response): Promise<Response> {
    const data = await this._service.findById(identity._id as Types.ObjectId, {
      password: 0,
      'security.oldPasswords': 0,
    });
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this.sanitizeAgentPayload(data, { includeOtpKey: true }),
    });
  }

  @Patch('me')
  @ApiUpdateDecorator(AgentsUpdateDto, AgentsDto)
  public async updateSelf(
    @ReqIdentity() identity: AgentType,
    @Body() body: AgentsSelfUpdateDto,
    @Res() res: Response,
  ): Promise<Response> {
    const currentAgent = await this._service.findById<Agents>(identity._id as Types.ObjectId);
    const currentSecurity =
      currentAgent?.security && typeof currentAgent.security === 'object'
        ? typeof (currentAgent.security as any).toObject === 'function'
          ? (currentAgent.security as any).toObject()
          : { ...(currentAgent.security as unknown as Record<string, unknown>) }
        : {};

    const payload: Record<string, any> = { ...(body as Record<string, any>) };
    delete payload.roles;
    delete payload.state;
    delete payload.hidden;
    delete payload.thirdPartyAuth;
    delete payload.security?.secretKey;
    delete payload.security?.oldPasswords;
    delete payload.security?.u2fKey;
    delete payload.currentPassword;

    if (payload.security && typeof payload.security === 'object') {
      payload.security = {
        ...currentSecurity,
        ...payload.security,
      };
    }
    payload.security = {
      ...(payload.security || currentSecurity || {}),
      secretKey:
        typeof (currentSecurity as any)?.secretKey === 'string' && (currentSecurity as any).secretKey.trim().length > 0
          ? (currentSecurity as any).secretKey
          : randomBytes(32).toString('hex'),
    };

    if (typeof payload.password === 'string' && payload.password.trim().length > 0) {
      const currentPassword = `${body?.currentPassword || ''}`.trim();
      if (!currentPassword) {
        throw new BadRequestException('Le mot de passe actuel est requis');
      }
      const currentHash = `${(currentAgent as any)?.password || ''}`;
      const ok = currentHash ? await argon2Verify(currentHash, currentPassword) : false;
      if (!ok) {
        throw new BadRequestException('Le mot de passe actuel est invalide');
      }

      const newPassword = `${payload.password}`.trim();
      if ((await this.passwdadmService.checkPolicies(newPassword)) === false) {
        throw new BadRequestException({
          message: 'Une erreur est survenue : Le mot de passe ne respecte pas la politique des mots de passe',
          error: 'Bad Request',
          statusCode: 400,
        });
      }

      const policies: any = await this.passwdadmService.getPolicies();
      const historyCount = Number(policies?.passwordHistoryCount || 0);
      await assertAgentPasswordNotReused({
        newPassword,
        currentHash,
        oldHashes: (currentSecurity as any)?.oldPasswords,
      });
      payload.security = {
        ...(payload.security || {}),
        oldPasswords: nextAgentOldPasswords({
          currentHash,
          oldHashes: (currentSecurity as any)?.oldPasswords,
          maxCount: Number.isFinite(historyCount) ? historyCount : 0,
        }),
      };

      payload.security = {
        ...(payload.security || {}),
        secretKey: randomBytes(32).toString('hex'),
      };
    }

    const data = await this._service.update(identity._id as Types.ObjectId, payload as AgentsUpdateDto);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this.sanitizeAgentPayload(data, { includeOtpKey: true }),
    });
  }

  @Post('me/mfa/totp/setup')
  public async setupTotpSelf(@ReqIdentity() identity: AgentType, @Res() res: Response): Promise<Response> {
    const issuer = 'Sesame';
    const accountName = `${identity?.username || identity?._id || 'account'}`;
    const secret = speakeasy.generateSecret({
      name: `${issuer}:${accountName}`,
      issuer,
      length: 32,
    });
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: `${issuer}:${accountName}`,
      issuer,
      encoding: 'ascii',
      algorithm: 'sha1',
      digits: 6,
      period: 30,
    });

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: {
        secret: secret.base32,
        otpauthUrl,
      },
    });
  }

  @Post('me/mfa/totp/confirm')
  public async confirmTotpSelf(
    @ReqIdentity() identity: AgentType,
    @Body() body: TotpConfirmBody,
    @Res() res: Response,
  ): Promise<Response> {
    const secret = `${body?.secret || ''}`.trim().replace(/\s+/g, '').toUpperCase();
    const otpCode = `${body?.otpCode || ''}`.trim();
    if (!secret || !otpCode) {
      throw new BadRequestException('Secret et code OTP requis');
    }

    const isValid = speakeasy.totp.verify({
      secret,
      token: otpCode,
      encoding: 'base32',
      window: 1,
    });
    if (!isValid) {
      throw new BadRequestException('Code OTP invalide');
    }

    const currentAgent = await this._service.findById<Agents>(identity._id as Types.ObjectId);
    const currentSecurity =
      currentAgent?.security && typeof currentAgent.security === 'object'
        ? typeof (currentAgent.security as any).toObject === 'function'
          ? (currentAgent.security as any).toObject()
          : { ...(currentAgent.security as unknown as Record<string, unknown>) }
        : {};

    const data = await this._service.update(
      identity._id as Types.ObjectId,
      {
        security: {
          ...currentSecurity,
          otpKey: secret,
        },
      } as AgentsUpdateDto,
    );

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this.sanitizeAgentPayload(data, { includeOtpKey: true }),
    });
  }

  @Post('me/mfa/totp/disable')
  public async disableTotpSelf(
    @ReqIdentity() identity: AgentType,
    @Body() body: { otpCode?: string },
    @Res() res: Response,
  ): Promise<Response> {
    const currentAgent = await this._service.findById<Agents>(identity._id as Types.ObjectId);
    const currentSecurity =
      currentAgent?.security && typeof currentAgent.security === 'object'
        ? typeof (currentAgent.security as any).toObject === 'function'
          ? (currentAgent.security as any).toObject()
          : { ...(currentAgent.security as unknown as Record<string, unknown>) }
        : {};

    const currentOtpKey = `${(currentSecurity as any)?.otpKey || ''}`.trim().replace(/\s+/g, '').toUpperCase();
    if (!currentOtpKey) {
      throw new BadRequestException('MFA TOTP non activé');
    }

    const otpCode = `${body?.otpCode || ''}`.trim();
    if (!otpCode) {
      throw new BadRequestException('Code OTP requis');
    }

    const isValid = speakeasy.totp.verify({
      secret: currentOtpKey,
      token: otpCode,
      encoding: 'base32',
      window: 1,
    });
    if (!isValid) {
      throw new BadRequestException('Code OTP invalide');
    }

    const data = await this._service.update(
      identity._id as Types.ObjectId,
      {
        security: {
          ...currentSecurity,
          otpKey: '',
        },
      } as AgentsUpdateDto,
    );

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this.sanitizeAgentPayload(data, { includeOtpKey: true }),
    });
  }

  @Post('me/mfa/webauthn/register/begin')
  @RequireMfa()
  public async beginWebAuthnRegisterSelf(
    @ReqIdentity() identity: AgentType,
    @Body() body: WebAuthnRegisterBeginDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const rpID = this.getWebAuthnRpId(req);
    const rpName = this.getWebAuthnRpName();
    const expectedOrigin = this.getWebAuthnExpectedOrigin(req);
    if (!rpID || !expectedOrigin) {
      throw new BadRequestException('WebAuthn non configuré (RP ID / origin manquants)');
    }

    const currentAgent = await this._service.findById<Agents>(identity._id as Types.ObjectId);
    const existing = Array.isArray((currentAgent as any)?.security?.u2fKey)
      ? (currentAgent as any).security.u2fKey
      : [];
    const excludeCredentials = existing
      .map((k: any) => this.normalizeWebAuthnCredentialId(`${k?.credentialId || ''}`))
      .filter((id: string) => id.length > 0)
      .map((id: string) => ({
        id,
        type: 'public-key' as const,
      }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(`${identity._id}`),
      userName: `${(currentAgent as any)?.username || identity?._id}`,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
    });

    await this.redis.set(
      [this.WEBAUTHN_REG_PREFIX, `${identity._id}`].join(':'),
      JSON.stringify({
        challenge: options.challenge,
        createdAt: Date.now(),
        expectedOrigin,
        rpID,
        name: `${body?.name || ''}`.trim(),
      }),
      'EX',
      this.WEBAUTHN_REG_TTL_SECONDS,
    );

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: options,
    });
  }

  @Post('me/mfa/webauthn/register/finish')
  @RequireMfa()
  public async finishWebAuthnRegisterSelf(
    @ReqIdentity() identity: AgentType,
    @Body() body: WebAuthnRegisterFinishDto,
    @Res() res: Response,
  ): Promise<Response> {
    const key = [this.WEBAUTHN_REG_PREFIX, `${identity._id}`].join(':');
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new BadRequestException('Challenge WebAuthn manquant ou expiré');
    }
    const stored = JSON.parse(raw) as { challenge: string; expectedOrigin: string; rpID: string; name?: string };

    const responseJson = (body?.response || {}) as any;
    const verification = await verifyRegistrationResponse({
      response: responseJson,
      expectedChallenge: stored.challenge,
      expectedOrigin: stored.expectedOrigin,
      expectedRPID: stored.rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Enregistrement WebAuthn invalide');
    }

    const regInfo: any = verification.registrationInfo as any;
    const credential: any = regInfo?.credential || {};
    const credentialIdRaw = credential?.id || regInfo?.credentialID;
    const publicKeyRaw = credential?.publicKey || regInfo?.credentialPublicKey;
    const counterRaw = credential?.counter ?? regInfo?.counter;

    const credentialIdB64u = this.bufferToBase64url(credentialIdRaw);
    const publicKeyB64u = this.bufferToBase64url(publicKeyRaw);

    const currentAgent = await this._service.findById<Agents>(identity._id as Types.ObjectId);
    const currentSecurity =
      currentAgent?.security && typeof currentAgent.security === 'object'
        ? typeof (currentAgent.security as any).toObject === 'function'
          ? (currentAgent.security as any).toObject()
          : { ...(currentAgent.security as unknown as Record<string, unknown>) }
        : {};

    const existing = Array.isArray((currentSecurity as any)?.u2fKey) ? ((currentSecurity as any).u2fKey as any[]) : [];
    if (existing.some((k) => this.normalizeWebAuthnCredentialId(`${k?.credentialId || ''}`) === credentialIdB64u)) {
      throw new BadRequestException('Cette clé est déjà enregistrée');
    }

    const name = (`${body?.name || stored?.name || ''}`.trim() || '').slice(0, 80);
    const next = [
      ...existing,
      {
        credentialId: credentialIdB64u,
        publicKey: publicKeyB64u,
        signCount: Number.isFinite(counterRaw) ? counterRaw : 0,
        transports: (responseJson as any)?.response?.transports || [],
        createdAt: new Date(),
        name,
      },
    ];

    const data = await this._service.update(
      identity._id as Types.ObjectId,
      {
        security: {
          ...currentSecurity,
          u2fKey: next,
        },
      } as AgentsUpdateDto,
    );

    await this.redis.del(key);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this.sanitizeAgentPayload(data, { includeOtpKey: true }),
    });
  }

  @Delete('me/mfa/webauthn/:credentialId')
  @RequireMfa()
  public async deleteWebAuthnCredentialSelf(
    @ReqIdentity() identity: AgentType,
    @Param('credentialId') credentialId: string,
    @Res() res: Response,
  ): Promise<Response> {
    const normalizedCredentialId = `${credentialId || ''}`.trim();
    if (!normalizedCredentialId) {
      throw new BadRequestException('Identifiant de clé requis');
    }

    const currentAgent = await this._service.findById<Agents>(identity._id as Types.ObjectId);
    const currentSecurity =
      currentAgent?.security && typeof currentAgent.security === 'object'
        ? typeof (currentAgent.security as any).toObject === 'function'
          ? (currentAgent.security as any).toObject()
          : { ...(currentAgent.security as unknown as Record<string, unknown>) }
        : {};

    const existing = Array.isArray((currentSecurity as any)?.u2fKey) ? ((currentSecurity as any).u2fKey as any[]) : [];
    const next = existing.filter((key) => `${key?.credentialId || ''}`.trim() !== normalizedCredentialId);
    if (next.length === existing.length) {
      throw new BadRequestException('Clé de sécurité introuvable');
    }

    const data = await this._service.update(
      identity._id as Types.ObjectId,
      {
        security: {
          ...currentSecurity,
          u2fKey: next,
        },
      } as AgentsUpdateDto,
    );

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this.sanitizeAgentPayload(data, { includeOtpKey: true }),
    });
  }

  /**
   * Met à jour un agent existant
   *
   * Endpoint PATCH permettant de modifier partiellement les données d'un agent.
   * Seuls les champs fournis dans le body seront mis à jour.
   *
   * @async
   * @param {Types.ObjectId} _id - Identifiant MongoDB de l'agent (24 caractères hexadécimaux)
   * @param {AgentsUpdateDto} body - Données de mise à jour de l'agent
   * @param {Response} res - Objet de réponse Express
   * @returns {Promise<Response>} Réponse HTTP avec l'agent mis à jour
   * @throws {NotFoundException} Si l'agent n'est pas trouvé
   * @throws {BadRequestException} Si les données fournies sont invalides
   */
  @Patch(':_id([0-9a-fA-F]{24})')
  @RequireMfa()
  @UseRoles({
    resource: '/core/agents',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiUpdateDecorator(AgentsUpdateDto, AgentsDto)
  public async update(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: AgentsUpdateDto,
    @Res() res: Response,
  ): Promise<Response> {
    const payload: Record<string, any> = { ...(body as Record<string, any>) };
    if (typeof payload.password === 'string' && payload.password.trim().length > 0) {
      const newPassword = `${payload.password}`.trim();
      if ((await this.passwdadmService.checkPolicies(newPassword)) === false) {
        throw new BadRequestException({
          message: 'Une erreur est survenue : Le mot de passe ne respecte pas la politique des mots de passe',
          error: 'Bad Request',
          statusCode: 400,
        });
      }

      const currentAgent = await this._service.findById<Agents>(_id);
      const currentSecurity =
        currentAgent?.security && typeof currentAgent.security === 'object'
          ? typeof (currentAgent.security as any).toObject === 'function'
            ? (currentAgent.security as any).toObject()
            : { ...(currentAgent.security as unknown as Record<string, unknown>) }
          : {};
      const currentHash = `${(currentAgent as any)?.password || ''}`;

      const policies: any = await this.passwdadmService.getPolicies();
      const historyCount = Number(policies?.passwordHistoryCount || 0);
      await assertAgentPasswordNotReused({
        newPassword,
        currentHash,
        oldHashes: (currentSecurity as any)?.oldPasswords,
      });

      payload.security = {
        ...(currentSecurity as any),
        ...(payload.security || {}),
        oldPasswords: nextAgentOldPasswords({
          currentHash,
          oldHashes: (currentSecurity as any)?.oldPasswords,
          maxCount: Number.isFinite(historyCount) ? historyCount : 0,
        }),
        secretKey: randomBytes(32).toString('hex'),
      };
    }

    const data = await this._service.update(_id, payload as AgentsUpdateDto);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this.sanitizeAgentPayload(data),
    });
  }

  /**
   * Supprime un agent
   *
   * Endpoint DELETE permettant de supprimer un agent du système.
   *
   * @async
   * @param {Types.ObjectId} _id - Identifiant MongoDB de l'agent (24 caractères hexadécimaux)
   * @param {Response} res - Objet de réponse Express
   * @returns {Promise<Response>} Réponse HTTP avec les données de l'agent supprimé
   * @throws {NotFoundException} Si l'agent n'est pas trouvé
   */
  @Delete(':_id([0-9a-fA-F]{24})')
  @RequireMfa()
  @UseRoles({
    resource: '/core/agents',
    action: AC_ACTIONS.DELETE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiParam({ name: '_id', type: String })
  @ApiDeletedResponseDecorator(AgentsDto)
  public async remove(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.delete(_id);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this.sanitizeAgentPayload(data),
    });
  }
}
