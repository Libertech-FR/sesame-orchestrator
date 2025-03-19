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
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  FilterOptions,
  filterSchema,
  FilterSchema,
  SearchFilterOptions,
  SearchFilterSchema,
} from '@the-software-compagny/nestjs_module_restools';
import { Response } from 'express';
import { Document, Types } from 'mongoose';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { ApiUpdateDecorator } from '~/_common/decorators/api-update.decorator';
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { MixedValue } from '~/_common/types/mixed-value.type';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { IdentitiesCreateDto, IdentitiesDto, IdentitiesUpdateDto } from './_dto/identities.dto';
import { IdentityState } from './_enums/states.enum';
import { Identities } from './_schemas/identities.schema';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { FilestorageService } from '~/core/filestorage/filestorage.service';
import { TransformersFilestorageService } from '~/core/filestorage/_services/transformers-filestorage.service';
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service';

@ApiTags('management/identities')
@Controller('identities')
export class IdentitiesCrudController extends AbstractController {
  public constructor(
    protected readonly _service: IdentitiesCrudService,
    protected readonly _validation: IdentitiesValidationService,
    protected readonly filestorage: FilestorageService,
    private readonly transformerService: TransformersFilestorageService,
  ) {
    super();
  }
  protected static readonly projection: PartialProjectionType<IdentitiesDto> = {
    state: 1,
    initState: 1,
    inetOrgPerson: 1,
    additionalFields: 1,
    metadata: 1,
    dataStatus: 1,
  };

  @Post()
  @ApiCreateDecorator(IdentitiesCreateDto, IdentitiesDto)
  public async create(
    @Res() res: Response,
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
    if (!body.inetOrgPerson.employeeType) {
      body.inetOrgPerson.employeeType = 'LOCAL';
    }
    if (!body.inetOrgPerson.cn) {
      body.inetOrgPerson.cn = [
        body.inetOrgPerson.sn?.toUpperCase(),
        body.inetOrgPerson.givenName,
      ].join(' ').trim();
    }
    if (!body.inetOrgPerson.displayName) {
      body.inetOrgPerson.displayName = [
        body.inetOrgPerson.givenName,
        body.inetOrgPerson.sn?.toUpperCase(),
      ].join(' ').trim();
    }
    const data = await this._service.create<Identities>(body);
    // If the state is TO_COMPLETE, the identity is created but additional fields are missing or invalid
    // Else the state is TO_VALIDATE, we return a 201 status code
    if (data.toObject().state === IdentityState.TO_COMPLETE) {
      statusCode = HttpStatus.ACCEPTED;
      message = 'Identitée créée avec succès, mais des champs additionnels sont manquants ou invalides.';
    }

    return res.status(statusCode).json({
      statusCode,
      data,
      message,
    });
  }
  @Get('getdeleted')
  @ApiPaginatedDecorator(PickProjectionHelper(IdentitiesDto, IdentitiesCrudController.projection))
  public async getdeleted(
    @Res() res: Response,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<
    Response<
      {
        statusCode: number;
        data?: Document<Identities, any, Identities>;
        total?: number;
        message?: string;
        validations?: MixedValue;
      },
      any
    >
  > {
    const [data, total] = await this._service.trashAndCount(IdentitiesCrudController.projection, searchFilterOptions);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    });
  }

  @Get()
  @ApiPaginatedDecorator(PickProjectionHelper(IdentitiesDto, IdentitiesCrudController.projection))
  public async search(
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<
    Response<
      {
        statusCode: number;
        data?: Document<Identities, any, Identities>;
        total?: number;
        message?: string;
        validations?: MixedValue;
      },
      any
    >
  > {
    const [data, total] = await this._service.findAndCount(
      searchFilterSchema,
      IdentitiesCrudController.projection,
      searchFilterOptions,
    );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      total,
      data,
    });
  }

  @Get(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiReadResponseDecorator(IdentitiesDto)
  public async read(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const identity = await this._service.findById(_id);
      const data = this._service.transformNullsToString(JSON.parse(JSON.stringify(identity)));
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data,
      });
    } catch (error) {
      console.log('error', error);
      let validations = error.validations;
      if (error instanceof BadRequestException) validations = error.getResponse();
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message,
        validations: validations,
      });
    }
  }

  @Get('count')
  @ApiOperation({ summary: "Compte le nombre d'identitées en fonctions des filtres fournis" })
  public async count(
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response<number>> {
    const total = await this._service.count(searchFilterSchema, searchFilterOptions);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: total,
    });
  }

  @Post('count-all')
  @ApiOperation({ summary: "Compte le nombre d'identitées en fonctions des filtres fournis via un body de counts" })
  public async countAll(
    @Res() res: Response,
    @Body() body: {
      [key: string]: FilterSchema;
    },
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response<number>> {
    const filters = {}
    for (const key in body) {
      filters[key] = filterSchema(body[key]);
      console.log('filters', key, body[key], filters[key]);
    }

    const totals = await this._service.countAll(filters, searchFilterOptions);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: totals,
    });
  }

  @Patch(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiUpdateDecorator(IdentitiesUpdateDto, IdentitiesDto)
  public async update(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: IdentitiesUpdateDto,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.update(_id, body);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Patch(':_id([0-9a-fA-F]{24})/state')
  @ApiParam({ name: '_id', type: String })
  @ApiUpdateDecorator(IdentitiesUpdateDto, IdentitiesDto)
  public async updateState(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: IdentitiesUpdateDto,
    @Res() res: Response,
  ): Promise<Response> {
    const identity = await this._service.findById<Identities>(_id);
    if (!identity) {
      throw new BadRequestException('Identity not found');
    }
    if (identity.state !== IdentityState.TO_VALIDATE) {
      throw new BadRequestException("La validation de l'identité est déjà complétée.");
    }
    const data = await this._service.updateState(_id, body.state);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Patch('state')
  @ApiOperation({ summary: "Met à jour l'état d'une ou plusieurs <Identitées> en masse" })
  public async updateStateMany(
    @Res() res: Response,
    @Body()
    body: {
      originState: IdentityState;
      targetState: IdentityState;
      ids: Types.ObjectId[];
    },
  ): Promise<Response> {
    const data = await this._service.updateStateMany(body);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  //@Delete(':_id([0-9a-fA-F]{24})')
  //@ApiParam({ name: '_id', type: String })
  //@ApiDeletedResponseDecorator(IdentitiesDto)
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
