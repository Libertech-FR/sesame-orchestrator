import { Body, Controller, HttpStatus, Post, Res, UseGuards, Headers, Get } from '@nestjs/common';
import { Public } from '~/_common/decorators/public.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ModuleRef } from '@nestjs/core';
import { AuthService } from '~/core/auth/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ReqIdentity } from '~/_common/decorators/params/req-identity.decorator';
import { AgentType } from '~/_common/types/agent.type';

@Public()
@ApiTags('core/auth')
@Controller('auth')
export class AuthController extends AbstractController {
  constructor(
    protected moduleRef: ModuleRef,
    private readonly service: AuthService,
  ) {
    super();
  }

  @Post('local')
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Authentification interne utilisateur' })
  public async authenticateWithLocal(@Res() res: Response, @ReqIdentity() user: AgentType): Promise<Response> {
    const tokens = await this.service.createTokens(user);
    return res.status(HttpStatus.OK).json({
      ...tokens,
      user,
    });
  }

  @Get('session')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Récupération de la session en cours' })
  public async session(@Res() res: Response, @ReqIdentity() identity: AgentType): Promise<Response> {
    const user = await this.service.getSessionData(identity);
    return res.status(HttpStatus.OK).json({
      user: {
        ...user,
        sseToken: 'hZcdVqHScVDsDFdHOdcjmufEKFJVKaS8', //TODO: change to real token
      },
    });
  }

  //TODO: change any
  @Post('refresh')
  @ApiOperation({ summary: "Récupère un nouveau jeton d'authentification" })
  public async refresh(@Res() res: Response, @Body() body: { refresh_token: string }): Promise<Response> {
    const tokens = await this.service.renewTokens(body.refresh_token);
    return res.status(HttpStatus.OK).json({
      ...tokens,
      sseToken: 'hZcdVqHScVDsDFdHOdcjmufEKFJVKaS8', //TODO: change to real token
    });
  }

  @Post('logout')
  @ApiOperation({ summary: "Supprime le jeton d'authentification utilisateur" })
  public async logout(@Res() res: Response, @Headers('Authorization') jwt: string): Promise<Response> {
    await this.service.clearSession(jwt.replace(/^Bearer\s/, ''));
    return res.status(HttpStatus.OK).send();
  }
}
