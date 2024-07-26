import {Controller, Post, Body, Res, Logger, HttpStatus, Get} from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AskTokenDto } from './dto/ask-token.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {omit} from "radash";
import {PasswdadmService} from "~/settings/passwdadm/passwdadm.service";
import {PasswordPolicies} from "~/settings/passwdadm/_schemas/PasswordPolicies";
import {InitAccountDto} from "~/management/passwd/dto/init-account.dto";

@Controller('passwd')
@ApiTags('management/passwd')
export class PasswdController {
  private readonly logger = new Logger(PasswdController.name);

  public constructor(private passwdService: PasswdService,private passwdadmService: PasswdadmService) { }

  @Post('change')
  @ApiOperation({ summary: 'Execute un job de changement de mot de passe sur le/les backends' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Mot de passe synchronisé sur le/les backends' })
  public async change(@Body() body: ChangePasswordDto, @Res() res: Response): Promise<Response> {
    const debug = {}
    const [_, data] = await this.passwdService.change(body);
    this.logger.log(`Call passwd change for : ${body.uid}`);

    if (process.env.NODE_ENV === 'development') {
      debug['_debug'] = data;
    }

    return res.status(HttpStatus.OK).json({
      message: 'Password changed', status:0,
      ...debug,
    });
  }

  @Post('gettoken')
  @ApiOperation({ summary: 'Récupère un jeton de réinitialisation de mot de passe' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Retourne un jeton de réinitialisation de mot de passe' })
  public async gettoken(@Body() asktoken: AskTokenDto, @Res() res: Response): Promise<Response> {
    this.logger.log('GetToken for : ' + asktoken.uid);
    const token = await this.passwdService.askToken(asktoken);

    return res.status(HttpStatus.OK).json({ data: { token } });
  }

  @Post('verifytoken')
  @ApiOperation({ summary: 'Vérifie un jeton de réinitilisation de mot de passe' })
  @ApiResponse({ status: HttpStatus.OK })
  public async verifyToken(@Body() body: VerifyTokenDto, @Res() res: Response): Promise<Response> {
    this.logger.log('Verify token : ' + body.token);
    const data = await this.passwdService.decryptToken(body.token);

    return res.status(HttpStatus.OK).json({ data });
  }

  @Post('reset')
  @ApiOperation({ summary: 'Execute un job de réinitialisation de mot de passe sur le/les backends' })
  @ApiResponse({ status: HttpStatus.OK })
  public async reset(@Body() body: ResetPasswordDto, @Res() res: Response): Promise<Response> {
    const debug = {}
    const [_, data] = await this.passwdService.reset(body);

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
    const data = await this.passwdadmService.getPolicies()
    //const datax=omit(data.toObject,['_id'])
    return res.status(HttpStatus.OK).json({data})
  }
  @Post('init')
  @ApiOperation({ summary: 'Initialise le compte envoi un jeton par mail à l\'identité' })
  @ApiResponse({ status: HttpStatus.OK })
  public async init(@Body() body: InitAccountDto, @Res() res: Response): Promise<Response> {
    const debug = {}
    const ok=await this.passwdService.initAccount(body)
    return res.status(HttpStatus.OK).json({
      message: 'Email envoyé verifiez votre boite mail alternative et vos spam',
      ...debug,
    });
  }
}
