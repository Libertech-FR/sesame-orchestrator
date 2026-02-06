import { BadRequestException, Body, Controller, Get, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { IdentitiesDto } from './_dto/identities.dto';
import { FusionDto } from '~/management/identities/_dto/fusion.dto';
import { IdentitiesDoublonService } from '~/management/identities/identities-doublon.service';
import { Types } from 'mongoose';

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
  public async getDoublons(@Res() res: Response, @Query('includeIgnored') includeIgnored?: string): Promise<Response> {
    const includeIgnoredBool = /^(true|1|yes|on)$/i.test(includeIgnored || '');
    const data = await this._service.searchDoubles(includeIgnoredBool);
    const total = data.length;

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
      total,
    });
  }

  @Post('ignore-fusion')
  @ApiOperation({ summary: 'Ignore la fusion pour une identité' })
  @ApiParam({ name: 'id', description: 'ID de l\'identité', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fusion ignorée avec succès' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Identité non trouvée' })
  public async ignoreFusionForIdentities(
    @Res() res: Response,
    @Body('ids') ids: string[],
  ): Promise<Response> {
    if (ids.length !== 2) {
      throw new BadRequestException('Deux IDs doivent être fournis pour ignorer la fusion.');
    }

    if (!ids.every(id => Types.ObjectId.isValid(id))) {
      throw new BadRequestException('Tous les IDs doivent être des ObjectId valides.');
    }

    const data = await this._service.ignoreFusionForIdentities(ids.map(id => new Types.ObjectId(id)));

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Post('unignore-fusion')
  @ApiOperation({ summary: 'Annule l\'ignorance de la fusion pour une identité' })
  @ApiParam({ name: 'id', description: 'ID de l\'identité', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ignorance de fusion annulée avec succès' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Identité non trouvée' })
  public async unignoreFusionForIdentities(
    @Res() res: Response,
    @Body('ids') ids: string[],
  ): Promise<Response> {
    if (ids.length !== 2) {
      throw new BadRequestException('Deux IDs doivent être fournis pour annuler l\'ignorance de la fusion.');
    }

    if (!ids.every(id => Types.ObjectId.isValid(id))) {
      throw new BadRequestException('Tous les IDs doivent être des ObjectId valides.');
    }

    const data = await this._service.unignoreFusionForIdentities(ids.map(id => new Types.ObjectId(id)));

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
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
