import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { IdentitiesDefaultsService } from '~/settings/identities-defaults.service';
import { AC_ACTIONS, AC_DEFAULT_POSSESSION } from '~/_common/types/ac-types';
import { UseRoles } from '~/_common/decorators/use-roles.decorator';

@Controller('settings/identities')
@ApiTags('settings')
export class IdentitiesDefaultsController {
  public constructor(private identitiesDefaultsService: IdentitiesDefaultsService) {}

  // Lecture ouverte a quiconque peut lire les identites : le formulaire de creation
  // d'identite en a besoin pour pre-remplir les schemas par defaut.
  @Get('defaults')
  @UseRoles({
    resource: '/management/identities',
    action: AC_ACTIONS.READ,
    possession: AC_DEFAULT_POSSESSION,
  })
  @ApiOperation({ summary: 'Retourne les valeurs par defaut des identites (configs/identities/defaults.yml)' })
  @ApiResponse({ status: HttpStatus.OK })
  public async get(@Res() res: Response): Promise<Response> {
    const data = await this.identitiesDefaultsService.getDefaults();

    return res.status(HttpStatus.OK).json({ data });
  }
}
