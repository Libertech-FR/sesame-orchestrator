import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { Types } from 'mongoose';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiDeletedResponseDecorator } from '~/_common/decorators/api-deleted-response.decorator';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { Response } from 'express';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper';
import { FilterOptions, FilterSchema, SearchFilterOptions, SearchFilterSchema } from '@the-software-compagny/nestjs_module_restools';
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { KeyringsService } from '~/core/keyrings/keyrings.service';
import { KeyringsCreateDto, KeyringsDto } from '~/core/keyrings/_dto/keyrings.dto';

@ApiTags('core/keyrings')
@Controller('keyrings')
export class KeyringsController extends AbstractController {
  protected static readonly projection: PartialProjectionType<KeyringsDto> = {
    token: 0,
    // allowedNetworks: 1,
    // suspendedAt: 1,
  };

  public constructor(private readonly _service: KeyringsService) {
    super();
  }

  @Post()
  @ApiCreateDecorator(KeyringsCreateDto, KeyringsDto)
  public async create(@Res() res: Response, @Body() body: KeyringsCreateDto): Promise<Response> {
    const data = await this._service.create(body);
    return res.status(HttpStatus.CREATED).json({
      statusCode: HttpStatus.CREATED,
      data,
    });
  }

  @Get()
  @ApiPaginatedDecorator(PickProjectionHelper(KeyringsDto, KeyringsController.projection))
  public async search(
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response> {
    //TODO: search tree by parentId
    const [data, total] = await this._service.findAndCount(
      searchFilterSchema,
      KeyringsController.projection,
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
  @ApiReadResponseDecorator(KeyringsDto)
  public async read(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.findById(_id, {
      token: 0,
    });
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Delete(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiDeletedResponseDecorator(KeyringsDto)
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
