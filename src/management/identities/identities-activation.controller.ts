import {AbstractController} from '~/_common/abstracts/abstract.controller';
import {IdentitiesActivationService} from '~/management/identities/identities-activation.service';
import {ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import {Body, Controller, HttpStatus, Post, Res} from '@nestjs/common';
import {Response} from 'express';
import {ActivationDto} from '~/management/identities/_dto/_parts/activation-dto';
import {DataStatusEnum} from "~/management/identities/_enums/data-status";

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
      let param = DataStatusEnum.INACTIVE
      if ( body.status === true){
         param=DataStatusEnum.ACTIVE
      }
      const data = await this._service.activation(body.id, param);
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
