import { Body, Controller, Get, HttpStatus, Logger, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Document } from 'mongoose';
import { FilterOptions, SearchFilterOptions } from '@tacxou/nestjs_module_restools/search-filter-schema';
import { Identities } from '~/management/identities/_schemas/identities.schema';
import { InitAccountDto } from '~/management/passwd/_dto/init-account.dto';
import { InitManyDto } from '~/management/passwd/_dto/init-many.dto';
import { InitResetDto } from '~/management/passwd/_dto/init-reset.dto';
import { ResetByCodeDto } from '~/management/passwd/_dto/reset-by-code.dto';
import { PasswdadmService } from '~/settings/passwdadm.service';
import { ChangePasswordDto } from './_dto/change-password.dto';
import { ResetPasswordDto } from './_dto/reset-password.dto';
import { PasswdService } from './passwd.service';
import { resolveClientIp } from '~/_common/functions/resolve-client-ip';
import { HttpException } from '@nestjs/common';

@Controller('passwd')
@ApiTags('management/passwd')
export class PasswdController {
  private readonly logger = new Logger(PasswdController.name);

  public constructor(
    private passwdService: PasswdService,
    private passwdadmService: PasswdadmService,
  ) {}

  @Post('change')
  @ApiOperation({ summary: 'Execute un job de changement de mot de passe sur le/les backends' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Mot de passe synchronisé sur le/les backends' })
  public async change(@Req() req: any, @Body() body: ChangePasswordDto, @Res() res: Response): Promise<Response> {
    const debug = {};

    try {
      const [, data] = await this.passwdService.change(body, resolveClientIp(req) ?? null);
      this.logger.log(`Call passwd change for : ${body.uid}`);

      if (process.env.NODE_ENV === 'development') {
        debug['_debug'] = data;
      }

      return res.status(HttpStatus.OK).json({
        message: 'Password changed',
        status: 0,
        ...debug,
      });
    } catch (e) {
      if (e instanceof HttpException && e.getStatus?.() === HttpStatus.TOO_MANY_REQUESTS) {
        const payload = e.getResponse() as any;
        const retryAfterSeconds =
          payload && typeof payload === 'object' && Number.isFinite(Number(payload.retryAfterSeconds))
            ? Number(payload.retryAfterSeconds)
            : 0;
        if (retryAfterSeconds > 0) {
          res.set('Retry-After', `${retryAfterSeconds}`);
        }
        return res.status(HttpStatus.TOO_MANY_REQUESTS).json(payload);
      }
      throw e;
    }
  }

  @Post('resetbycode')
  @ApiOperation({ summary: 'reinitialise le mot de passe avec le code reçu' })
  @ApiResponse({ status: HttpStatus.OK })
  public async resetbycode(@Body() body: ResetByCodeDto, @Res() res: Response): Promise<Response> {
    const debug = {};
    this.logger.log('Reset by code : ' + body.token + ' code : ' + body.code);
    try {
      const [, data] = await this.passwdService.resetByCode(body);
      if (process.env.NODE_ENV === 'development') {
        debug['_debug'] = data;
      }

      return res.status(HttpStatus.OK).json({
        message: 'Password changed',
        ...debug,
      });
    } catch {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Erreur serveur',
        ...debug,
      });
    }
  }

  @Post('reset')
  @ApiOperation({ summary: 'Execute un job de réinitialisation de mot de passe sur le/les backends' })
  @ApiResponse({ status: HttpStatus.OK })
  public async reset(@Body() body: ResetPasswordDto, @Res() res: Response): Promise<Response> {
    const debug = {};
    const [, data] = await this.passwdService.reset(body);

    if (process.env.NODE_ENV === 'development') {
      debug['_debug'] = data;
    }

    return res.status(HttpStatus.OK).json({
      message: 'Password changed',
      ...debug,
    });
  }

  @Get('getpolicies')
  @ApiOperation({ summary: 'Retourne la politique de mot de passe à appliquer' })
  @ApiResponse({ status: HttpStatus.OK })
  public async getPolicies(@Res() res: Response): Promise<Response> {
    const data = await this.passwdadmService.getPolicies();
    //const datax=omit(data.toObject,['_id'])
    return res.status(HttpStatus.OK).json({ data });
  }

  @Post('init')
  @ApiOperation({ summary: "Initialise le compte envoi un jeton par mail à l'identité" })
  @ApiResponse({ status: HttpStatus.OK })
  public async init(@Body() body: InitAccountDto, @Res() res: Response): Promise<Response> {
    const data = await this.passwdService.initAccount(body);
    return res.status(HttpStatus.OK).json({
      message: 'Email envoyé verifiez votre boite mail alternative et vos spam',
      data,
    });
  }

  @Post('initmany')
  @ApiOperation({ summary: "Initialise plusieurs identités. envoi un jeton par mail à l'identité" })
  @ApiResponse({ status: HttpStatus.OK })
  public async initMany(@Body() body: InitManyDto, @Res() res: Response): Promise<Response> {
    const data = await this.passwdService.initMany(body);
    return res.status(HttpStatus.OK).json({
      message: 'identités initialisées',
      data,
    });
  }

  @Post('initoutdated')
  @ApiOperation({ summary: "Initialise toutes les identités dont l'invitation est périmée" })
  @ApiResponse({ status: HttpStatus.OK })
  public async initOutdated(
    @Body() body: Pick<InitManyDto, 'template' | 'variables'>,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this.passwdService.initOutdated(body);
    return res.status(HttpStatus.OK).json({
      message: 'identités initialisées',
      data,
    });
  }

  @Post('initreset')
  @ApiOperation({ summary: 'Demande l envoi de mail pour le reset' })
  @ApiResponse({ status: HttpStatus.OK })
  public async initreset(@Body() body: InitResetDto, @Res() res: Response): Promise<Response> {
    const debug = {};
    const data = await this.passwdService.initReset(body);

    return res.status(HttpStatus.OK).json({
      message: 'Email envoyé verifiez votre boite mail alternative et vos spam',
      token: data,
      ...debug,
    });
  }

  @Get('ioutdated')
  @ApiOperation({ summary: 'Compte donc l invitation d init n a pas été repondue dans les temps' })
  public async search(
    @Res() res: Response,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<
    Response<
      {
        data?: Document<Identities, any, Identities>;
      },
      any
    >
  > {
    const [data, total] = await this.passwdService.checkInitOutDated(searchFilterOptions);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    });
  }
}
