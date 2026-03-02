import { Body, Controller, Get, HttpStatus, Logger, Post, Res } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { PasswordPoliciesDto } from '~/settings/_dto/password-policy.dto'
import { PasswdadmService } from './passwdadm.service'
import { UseRoles } from '~/_common/decorators/use-roles.decorator'
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types'

@Controller('settings/passwdadm')
@ApiTags('settings')
export class PasswdadmController {
  public constructor(private passwdadmService: PasswdadmService) {}

  @Post('setpolicies')
  @UseRoles({
    resource: '/settings/passwdadm',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'enregistre la police de mdp' })
  @ApiResponse({ status: HttpStatus.OK })
  public async setPolicies(@Body() body: PasswordPoliciesDto, @Res() res: Response): Promise<Response> {
    const data = await this.passwdadmService.setPolicies(body);

    return res.status(HttpStatus.OK).json({ data });
  }

  @Get('getpolicies')
  @UseRoles({
    resource: '/settings/passwdadm',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Retourne la police de mot de passe' })
  @ApiResponse({ status: HttpStatus.OK })
  public async getPolicies(@Res() res: Response): Promise<Response> {
    const data = await this.passwdadmService.getPolicies();

    return res.status(HttpStatus.OK).json({ data });
  }
}
