import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, getSchemaPath, PartialType } from '@nestjs/swagger';
import {
  FilterOptions,
  FilterSchema,
  SearchFilterOptions,
  SearchFilterSchema,
} from '@the-software-compagny/nestjs_module_restools';
import { Response } from 'express';
import { Document, Types, isValidObjectId } from 'mongoose';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator';
import { ApiDeletedResponseDecorator } from '~/_common/decorators/api-deleted-response.decorator';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { ApiUpdateDecorator } from '~/_common/decorators/api-update.decorator';
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { MixedValue } from '~/_common/types/mixed-value.type';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { IdentitiesCreateDto, IdentitiesDto, IdentitiesUpdateDto, IdentitiesUpsertDto } from './_dto/identities.dto';
import { IdentityState } from './_enums/states.enum';
import { Identities } from './_schemas/identities.schema';
import { IdentitiesService } from './identities.service';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiFileUploadDecorator } from '~/_common/decorators/api-file-upload.decorator';
import { FilestorageCreateDto, FilestorageDto, FileUploadDto } from '~/core/filestorage/_dto/filestorage.dto';
import { FilestorageService } from '~/core/filestorage/filestorage.service';
import { FsType } from '~/core/filestorage/_enum/fs-type.enum';
import { join } from 'node:path';
import { omit } from 'radash';
import { TransformersFilestorageService } from '~/core/filestorage/_services/transformers-filestorage.service';
import { Public } from '~/_common/decorators/public.decorator';
import { FusionDto } from "~/management/identities/_dto/fusion.dto";
import { PaginatedFilterDto } from '~/_common/dto/paginated-filter.dto';

@ApiTags('management/identities')
@Controller('identities')
export class IdentitiesController extends AbstractController {
  public constructor(
    protected readonly _service: IdentitiesService,
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
    if (!body.inetOrgPerson.employeeType) {
      body.inetOrgPerson.employeeType = 'LOCAL';
    }
    if (!body.inetOrgPerson.cn) {
      body.inetOrgPerson.cn = `${(body.inetOrgPerson.sn || '').toUpperCase()} ${body.inetOrgPerson.givenName}`;
    }
    if (!body.inetOrgPerson.displayName) {
      body.inetOrgPerson.displayName = body.inetOrgPerson.givenName + ' ' + (body.inetOrgPerson.sn || '').toUpperCase();
    }
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

  @Post('upsert')
  @ApiCreateDecorator(IdentitiesUpsertDto, IdentitiesDto, {
    operationOptions: {
      summary: 'Importe ou met à jour une <Identitée> en fonction des filtres fournis',
    },
  })
  public async upsert(
    @Res()
    res: Response,
    @Body() body: IdentitiesUpsertDto,
    @Query('filters')
    filtersQuery: {
      [key: string]: string;
    }[] = [],
    @Query('errorOnNotFound') errorOnNotFound: string = 'false',
    @Query('upsert') upsert: string = 'true',
  ): Promise<
    Response<{
      statusCode: number;
      data?: Document<Identities, any, Identities>;
      message?: string;
      validations?: MixedValue;
    }>
  > {
    const filters = {};
    if (filtersQuery.length === 0) {
      throw new BadRequestException('Missing filters array');
    }
    for (const [key, filter] of Object.entries(filtersQuery)) {
      filters[key] = isValidObjectId(filter) ? new Types.ObjectId(`${filter}`) : filter;
    }

    //TODO: check if the filters are valid and if the body is equal to filters

    const [code, data] = await this._service.upsertWithFingerprint<Identities>(filters, body, {
      errorOnNotFound: /true|on|yes|1/i.test(errorOnNotFound),
      upsert: /true|on|yes|1/i.test(upsert),
    });

    // If the state is TO_COMPLETE, the identity is created but additional fields are missing or invalid
    // Else the state is TO_VALIDATE, we return a 201 status code
    if ((data as unknown as Identities).state === IdentityState.TO_COMPLETE) {
      return res.status(HttpStatus.ACCEPTED).json({
        statusCode: HttpStatus.ACCEPTED,
        message: 'Identitée créée avec succès, mais des champs additionnels sont manquants ou invalides.',
        data,
      });
    }

    return res.status(code).json({
      statusCode: code,
      message: code === HttpStatus.OK ? 'Identitée mise à jour avec succès.' : 'Identitée créée avec succès.',
      data,
    });
  }

  @Get()
  @ApiPaginatedDecorator(PickProjectionHelper(IdentitiesDto, IdentitiesController.projection))
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
      IdentitiesController.projection,
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

  @Post('upsert/photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiFileUploadDecorator(FileUploadDto, PartialType(FilestorageCreateDto), FilestorageDto)
  public async upsertInetOrgPersonJpegPhoto(
    @Res() res: Response,
    @Body() body: Partial<FilestorageCreateDto>,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false })) file?: Express.Multer.File,
  ): Promise<Response> {
    const identity = await this._service.findOne<Identities>(searchFilterSchema);
    const filter = {
      namespace: 'identities',
      path: join(
        [identity.inetOrgPerson?.employeeType, identity.inetOrgPerson?.employeeNumber, 'jpegPhoto.jpg'].join('/'),
      ),
    };

    const data = await this.filestorage.upsertFile(filter, {
      ...filter,
      type: FsType.FILE,
      file,
      ...omit(body, ['namespace', 'path', 'type', 'file'] as any),
    });

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Get('photo/raw')
  @ApiReadResponseDecorator(FilestorageDto)
  @ApiQuery({
    required: false,
    name: 'filters',
    style: 'deepObject',
    explode: true,
    type: 'object',
    schema: {
      $ref: getSchemaPath(PaginatedFilterDto),
    },
    description: 'Filtres de recherche, voir la documentation de chaque endpoint pour plus de détails',
  })
  public async readPhotoRaw(
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @Query('mime') mime: string = '',
  ): Promise<void> {
    const identity = await this._service.findOne<Identities>(searchFilterSchema);
    const [data, stream, parent] = await this.filestorage.findOneWithRawData({
      namespace: 'identities',
      path: join(
        [identity.inetOrgPerson?.employeeType, identity.inetOrgPerson?.employeeNumber, 'jpegPhoto.jpg'].join('/'),
      ),
    });
    await this.transformerService.transform(mime, res, data, stream, parent);
  }

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
