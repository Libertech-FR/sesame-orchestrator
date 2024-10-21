import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { IdentitiesActivationService } from '~/management/identities/identities-activation.service';
import { ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import { Body, Controller, HttpStatus, Post, Res} from '@nestjs/common';
import { Response } from 'express';
import { ActivationDto } from '~/management/identities/_dto/_parts/activation-dto';

@ApiTags('management/identities')
@Controller('identities')
export class IdentitiesActivationController extends AbstractController {
  public constructor(protected readonly _service: IdentitiesActivationService) {
    super();
  }

  @Post('activation')
  @ApiOperation({ summary: 'active/desactive l identité' })
  @ApiResponse({ status: HttpStatus.OK })
  public async activation(@Res() res: Response, @Body() body: ActivationDto): Promise<Response> {
    try {
      const data = await this._service.activation(body.id, body.status);
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
