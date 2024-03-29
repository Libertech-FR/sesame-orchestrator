import { Body, Controller, Get, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { MixedValue } from '~/_common/types/mixed-value.type';
import { AdditionalFieldsPart } from '../_schemas/_parts/additionalFields.part.schema';
import { IdentitiesValidationService } from './identities.validation.service';

@ApiTags('management')
@Controller('management/identities/validation')
export class IdentitiesValidationController extends AbstractController {
  constructor(protected readonly _service: IdentitiesValidationService) {
    super();
  }

  @Post()
  public async validate(
    @Res()
    res: Response,
    @Body() body: AdditionalFieldsPart,
  ): Promise<
    Response<
      {
        statusCode: number;
        data?: any;
        message?: string;
        validations?: MixedValue;
      },
      any
    >
  > {
    try {
      const data = await this._service.validate(body);
      return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        data,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message,
        validations: error.validations,
      });
    }
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
