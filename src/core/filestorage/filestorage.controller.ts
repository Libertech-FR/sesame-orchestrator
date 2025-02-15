import {
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
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  FilterOptions,
  FilterSchema,
  ObjectIdValidationPipe,
  SearchFilterOptions,
  SearchFilterSchema,
} from '@the-software-compagny/nestjs_module_restools';
import { Response } from 'express';
import { Types } from 'mongoose';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiDeletedResponseDecorator } from '~/_common/decorators/api-deleted-response.decorator';
import { ApiFileUploadDecorator } from '~/_common/decorators/api-file-upload.decorator';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { ApiUpdateDecorator } from '~/_common/decorators/api-update.decorator';
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { FilestorageCreateDto, FilestorageDto, FilestorageUpdateDto, FileUploadDto } from './_dto/filestorage.dto';
import { TransformersFilestorageService } from './_services/transformers-filestorage.service';
import { FilestorageService } from './filestorage.service';

@ApiTags('core/filestorage')
@Controller('filestorage')
export class FilestorageController extends AbstractController {
  protected static readonly projection: PartialProjectionType<FilestorageDto> = {
    type: 1,
    namespace: 1,
    path: 1,
    hidden: 1,
  };

  public constructor(
    private readonly _service: FilestorageService,
    private readonly transformerService: TransformersFilestorageService,
  ) {
    super();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiFileUploadDecorator(FileUploadDto, FilestorageCreateDto, FilestorageDto)
  public async create(
    @Res() res: Response,
    @Body() body: FilestorageCreateDto,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false })) file?: Express.Multer.File,
  ): Promise<Response> {
    const data = await this._service.create({ ...body, file });
    return res.status(HttpStatus.CREATED).json({
      statusCode: HttpStatus.CREATED,
      data,
    });
  }

  @Get()
  @ApiPaginatedDecorator(PickProjectionHelper(FilestorageDto, FilestorageController.projection))
  public async search(
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
    @Query('hidden') hiddenQuery: string,
  ): Promise<Response> {
    const hidden = /true|on|yes|1/i.test(hiddenQuery);
    const extraSearch = { hidden: { $ne: true } };
    if (hidden) delete extraSearch['hidden'];

    const [data, total] = await this._service.findAndCount(
      {
        ...extraSearch,
        ...searchFilterSchema,
      },
      FilestorageController.projection,
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
  @ApiReadResponseDecorator(FilestorageDto)
  public async read(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.findById(_id);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Get('path')
  @ApiReadResponseDecorator(FilestorageDto)
  public async readPath(
    @Query('namespace') namespace: string,
    @Query('path') path: string,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.findOne({ namespace, path });
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Get(':_id([0-9a-fA-F]{24})/raw')
  @ApiParam({ name: '_id', type: String })
  @ApiReadResponseDecorator(FilestorageDto)
  @ApiQuery({
    name: 'mime',
    required: false,
    type: String,
  })
  public async readRawData(
    @Res() res: Response,
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Query('mime') mime: string = '',
  ): Promise<void> {
    const [data, stream, parent] = await this._service.findByIdWithRawData(_id);
    await this.transformerService.transform(mime, res, data, stream, parent);
  }

  @Get('path/raw')
  @ApiReadResponseDecorator(FilestorageDto)
  @ApiQuery({
    name: 'mime',
    required: false,
    type: String,
  })
  public async readPathRawData(
    @Res() res: Response,
    @Query('namespace') namespace: string,
    @Query('path') path: string,
    @Query('mime') mime: string = '',
  ): Promise<void> {
    const [data, stream, parent] = await this._service.findOneWithRawData({ namespace, path });
    await this.transformerService.transform(mime, res, data, stream, parent);
  }

  @Patch(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiUpdateDecorator(FilestorageUpdateDto, FilestorageDto)
  public async update(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: FilestorageUpdateDto,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.update(_id, body);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Delete(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiDeletedResponseDecorator(FilestorageDto)
  public async remove(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.delete(_id);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }
}
