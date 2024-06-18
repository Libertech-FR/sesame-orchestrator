import { Body, Controller, Get, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { IdentitiesJsonformsService } from './identities.jsonforms.service';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger'

@ApiTags('management/identities/jsonforms')
@Controller('management/identities/jsonforms')
export class IdentitiesJsonFormsController extends AbstractController {
  constructor(private readonly _service: IdentitiesJsonformsService) {
    super();
  }

  @Post('generateAll')
  async generateAll(@Res() res: Response): Promise<any> {
    const result = await this._service.generateAll();
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: result,
    });
  }

  @Post('generate')
  async generate(@Res() res: Response, @Body('schema') schema: string | null = null): Promise<any> {
    const result = await this._service.generate({ schema, path: './configs/identities/jsonforms' });
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: result,
    });
  }

  @Get()
  async searchAll(@Res() res: Response): Promise<any> {
    const result = await this._service.findAll();
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: result,
    });
  }

  @Get(':schema')
  async search(@Res() res: Response, @Param('schema') schema): Promise<any> {
    const result = await this._service.findOne(schema);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: result,
    });
  }
}
