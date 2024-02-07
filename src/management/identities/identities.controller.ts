import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { IdentitiesDto, IdentitiesCreateDto, IdentitiesUpdateDto } from './_dto/identities.dto';
import { IdentitiesService } from './identities.service';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator';
import { ApiDeletedResponseDecorator } from '~/_common/decorators/api-deleted-response.decorator';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { ApiUpdateDecorator } from '~/_common/decorators/api-update.decorator';
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { Response } from 'express';
import { FilterOptions, FilterSchema, SearchFilterOptions, SearchFilterSchema } from '@streamkits/nestjs_module_scrud';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { MixedValue } from '~/_common/types/mixed-value.type';
import { Identities } from './_schemas/identities.schema';
import { Types, Document } from 'mongoose';
import { IdentityState } from './_enums/states.enum';
// import { IdentitiesValidationFilter } from '~/_common/filters/identities-validation.filter';

// @UseFilters(new IdentitiesValidationFilter())
@ApiTags('management')
@Controller('identities')
export class IdentitiesController extends AbstractController {
  constructor(
    protected readonly _service: IdentitiesService,
    protected readonly _validation: IdentitiesValidationService,
  ) {
    super();
  }
  protected static readonly projection: PartialProjectionType<IdentitiesDto> = {
    state: 1,
    inetOrgPerson: 1,
    additionalFields: 1,
  };

  @Post()
  @ApiCreateDecorator(IdentitiesCreateDto, IdentitiesDto)
  public async create(
    @Res()
    res: Response,
    @Body() body: IdentitiesCreateDto,
  ): Promise<
    Response<
      {
        statusCode: number;
        data?: Document<Identities, any, Identities>;
        message?: string;
        validations?: MixedValue;
      },
      any
    >
  > {
    let statusCode = HttpStatus.CREATED;
    let message = null;
    const data = await this._service.create<Identities>(body);
    // If the state is TO_COMPLETE, the identity is created but additional fields are missing or invalid
    // Else the state is TO_VALIDATE, we return a 201 status code
    if ((data as Identities).state === IdentityState.TO_COMPLETE) {
      statusCode = HttpStatus.ACCEPTED;
      message = 'Identitée créée avec succès, mais des champs additionnels sont manquants ou invalides.';
    }

    return res.status(statusCode).json({
      statusCode,
      data,
      message,
    });
  }

  @Get()
  @ApiPaginatedDecorator(PickProjectionHelper(IdentitiesDto, IdentitiesController.projection))
  public async search(
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response> {
    try {
      const [data, total] = await this._service.findAndCount(
        searchFilterSchema,
        IdentitiesController.projection,
        searchFilterOptions,
      );
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        total,
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

  @Get(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiReadResponseDecorator(IdentitiesDto)
  public async read(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const data = await this._service.findById(_id);
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data,
      });
    } catch (error) {
      let validations = error.validations;
      if (error instanceof BadRequestException) validations = error.getResponse();
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message,
        validations: validations,
      });
    }
  }

  @Patch(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiUpdateDecorator(IdentitiesUpdateDto, IdentitiesDto)
  public async update(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: IdentitiesUpdateDto,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const data = await this._service.update(_id, body);
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
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

  @Delete(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiDeletedResponseDecorator(IdentitiesDto)
  public async remove(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const data = await this._service.delete(_id);
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
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
}
