import { Body, Controller, Get, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { IdentitiesJsonformsService } from './identities.jsonforms.service';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('management/identities/jsonforms')
@Controller('management/identities/jsonforms')
export class IdentitiesJsonFormsController extends AbstractController {
  public constructor(private readonly _service: IdentitiesJsonformsService) {
    super();
  }

  @Post('generateAll')
  @ApiOperation({ summary: 'Génère tous les JSON Forms liés aux schémas personnalisés' })
  public async generateAll(@Res() res: Response): Promise<any> {
    const result = await this._service.generateAll();
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: result,
    });
  }

  @Post('generate')
  @ApiOperation({ summary: "Génère un JSON Forms d'un schéma personnalisé" })
  public async generate(@Res() res: Response, @Body('schema') schema: string | null = null): Promise<any> {
    const result = await this._service.generate({ schema, path: './configs/identities/jsonforms' });
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: result,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Liste les JSON Forms de schémas personnalisés' })
  public async searchAll(@Res() res: Response): Promise<any> {
    const result = await this._service.findAll();
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: result,
    });
  }

  // @Get(':schema')
  @Post(':schema')
  @ApiOperation({ summary: "Récupère un JSON Forms d'un schéma personnalisé" })
  public async search(
    @Res() res: Response,
    @Param('schema') schema,
    @Query('mode') mode: 'create' | 'update',
  ): Promise<any> {
    const result = await this._service.findOne(schema, { mode });
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: result,
    });
  }
}
