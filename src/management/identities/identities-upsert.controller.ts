import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  ParseFilePipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, PartialType } from '@nestjs/swagger';
import { FilterSchema, SearchFilterSchema } from '@the-software-compagny/nestjs_module_restools';
import { Response } from 'express';
import { Document, Types, isValidObjectId } from 'mongoose';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator';
import { MixedValue } from '~/_common/types/mixed-value.type';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { IdentitiesDto, IdentitiesUpsertDto } from './_dto/identities.dto';
import { IdentityState } from './_enums/states.enum';
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
import { IdentitiesUpsertService } from '~/management/identities/identities-upsert.service';

@ApiTags('management/identities')
@Controller('identities')
export class IdentitiesUpsertController extends AbstractController {
  public constructor(
    protected readonly _service: IdentitiesUpsertService,
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
}
