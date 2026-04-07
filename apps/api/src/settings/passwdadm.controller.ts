import { BadRequestException, Body, Controller, Get, HttpStatus, Logger, Post, Res } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { PasswordPoliciesDto } from '~/settings/_dto/password-policy.dto'
import { PasswdadmService } from './passwdadm.service'
import { UseRoles } from '~/_common/decorators/use-roles.decorator'
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types'
import { ConfigService } from '@nestjs/config'

@Controller('settings/passwdadm')
@ApiTags('settings')
export class PasswdadmController {
  public constructor(
    private passwdadmService: PasswdadmService,
    private configService: ConfigService,
  ) {}

  @Post('setpolicies')
  @UseRoles({
    resource: '/settings/passwdadm',
    action: AC_ACTIONS.UPDATE,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'enregistre la police de mdp' })
  @ApiResponse({ status: HttpStatus.OK })
  public async setPolicies(@Body() body: PasswordPoliciesDto, @Res() res: Response): Promise<Response> {
    if (body?.pwnedRecheckEnabled) {
      const status = this.getHibpKeyStatus()
      if (!status.valid) {
        throw new BadRequestException(status.reason || 'Clé SESAME_PASSWORD_HISTORY_HIBP_KEY invalide')
      }
    }
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

  @Get('hibp-keystatus')
  @UseRoles({
    resource: '/settings/passwdadm',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Retourne le statut de validité de la clé de chiffrement HIBP' })
  @ApiResponse({ status: HttpStatus.OK })
  public async hibpKeyStatus(@Res() res: Response): Promise<Response> {
    return res.status(HttpStatus.OK).json({ data: this.getHibpKeyStatus() })
  }

  private getHibpKeyStatus(): { valid: boolean; reason: string | null } {
    const raw = (this.configService.get<string>('SESAME_PASSWORD_HISTORY_HIBP_KEY') || '').trim()
    if (!raw) {
      return { valid: false, reason: 'Clé manquante (SESAME_PASSWORD_HISTORY_HIBP_KEY)' }
    }

    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return { valid: true, reason: null }
    }

    const buf = Buffer.from(raw, 'base64')
    if (buf.length !== 32) {
      return { valid: false, reason: 'Clé invalide (base64) : doit décoder en 32 bytes' }
    }

    return { valid: true, reason: null }
  }
}
