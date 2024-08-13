import { Body, Controller, Get, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PasswordPoliciesDto } from '~/settings/_dto/password-policy.dto';
import { PasswdadmService } from './passwdadm.service';

@Controller('settings/passwdadm')
@ApiTags('settings')
export class PasswdadmController {
  private readonly logger = new Logger(PasswdadmController.name);

  public constructor(private passwdadmService: PasswdadmService) {}

  @Post('setpolicies')
  @ApiOperation({ summary: 'enregistre la police de mdp' })
  @ApiResponse({ status: HttpStatus.OK })
  public async setPolicies(@Body() body: PasswordPoliciesDto, @Res() res: Response): Promise<Response> {
    const data = await this.passwdadmService.setPolicies(body);
    //const datax=omit(data.toObject,['_id'])
    return res.status(HttpStatus.OK).json({ data });
  }
  @Get('getpolicies')
  @ApiOperation({ summary: 'Retourne la police de mot de passe' })
  @ApiResponse({ status: HttpStatus.OK })
  public async getPolicies(@Res() res: Response): Promise<Response> {
    const data = await this.passwdadmService.getPolicies();
    return res.status(HttpStatus.OK).json({ data });
  }
}
