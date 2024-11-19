import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { IdentitiesActivationService } from '~/management/identities/identities-activation.service';
import { ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import { Body, Controller, HttpStatus, Post, Res} from '@nestjs/common';
import { Response } from 'express';
import { ActivationDto } from '~/management/identities/_dto/_parts/activation-dto';
import {ForcePasswordDto} from "~/management/identities/_dto/force-password-dto";
import {IdentitiesForcepasswordService} from "~/management/identities/identities-forcepassword.service";

@ApiTags('management/identities')
@Controller('identities')
export class IdentitiesForcePasswordController extends AbstractController {
  public constructor(protected readonly _service: IdentitiesForcepasswordService) {
    super();
  }
  @Post('forcepassword')
  @ApiOperation({ summary: 'force le mot de passe de l identite' })
  @ApiResponse({ status: HttpStatus.OK })
  public async forcePassword(@Res() res: Response, @Body() body: ForcePasswordDto): Promise<Response> {
    try {
      const data = await this._service.forcePassword(body.id, body.newPassword);
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }
}
