import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { IdentitiesDto } from './_dto/identities.dto';
import { FusionDto } from '~/management/identities/_dto/fusion.dto';
import { IdentitiesDoublonService } from '~/management/identities/identities-doublon.service';

@ApiTags('management/identities')
@Controller('identities')

export class IdentitiesDoublonController extends AbstractController {
  public constructor(protected readonly _service: IdentitiesDoublonService) {
    super();
  }
  protected static readonly projection: PartialProjectionType<IdentitiesDto> = {
    state: 1,
    initState: 1,
    inetOrgPerson: 1,
    additionalFields: 1,
    metadata: 1,
  };

  @Get('duplicates')
  @ApiOperation({ summary: 'Renvoie la liste des doublons supposés' })
  public async getDoublons(@Res() res: Response): Promise<Response> {
    const data = await this._service.searchDoubles();
    const total = data.length;
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
      total,
    });
  }

  @Post('fusion')
  @ApiOperation({ summary: 'fusionne les deux identités' })
  @ApiResponse({ status: HttpStatus.OK })
  public async fusion(
    @Body() body: FusionDto,
    @Res() res: Response,
  ): Promise<Response> {
    const newId = await this._service.fusion(body.id1, body.id2);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      newId,
    });
  }
}
