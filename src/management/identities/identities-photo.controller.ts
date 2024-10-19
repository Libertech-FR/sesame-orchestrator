import {
  Body,
  Controller,
  Get,
  HttpStatus,
  ParseFilePipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiQuery, ApiTags, getSchemaPath, PartialType } from '@nestjs/swagger';
import { FilterSchema, SearchFilterSchema } from '@the-software-compagny/nestjs_module_restools';
import { Response } from 'express';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { IdentitiesDto } from './_dto/identities.dto';
import { Identities } from './_schemas/identities.schema';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiFileUploadDecorator } from '~/_common/decorators/api-file-upload.decorator';
import { FilestorageCreateDto, FilestorageDto, FileUploadDto } from '~/core/filestorage/_dto/filestorage.dto';
import { FilestorageService } from '~/core/filestorage/filestorage.service';
import { FsType } from '~/core/filestorage/_enum/fs-type.enum';
import { join } from 'node:path';
import { omit } from 'radash';
import { TransformersFilestorageService } from '~/core/filestorage/_services/transformers-filestorage.service';
import { PaginatedFilterDto } from '~/_common/dto/paginated-filter.dto';
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service';

@ApiTags('management/identities')
@Controller('identities')
export class IdentitiesPhotoController extends AbstractController {
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
  };

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
}
