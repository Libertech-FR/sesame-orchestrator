import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Res } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { Types } from 'mongoose';
import { ApiUpdateDecorator } from '~/_common/decorators/api-update.decorator';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiDeletedResponseDecorator } from '~/_common/decorators/api-deleted-response.decorator';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { AgentsCreateDto, AgentsDto, AgentsUpdateDto } from '~/core/agents/_dto/agents.dto';
import { Response } from 'express';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper';
import { FilterOptions, FilterSchema, SearchFilterOptions, SearchFilterSchema } from '@streamkits/nestjs_module_scrud';
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';

@ApiTags('core')
@Controller('agents')
export class AgentsController extends AbstractController {
  protected static readonly projection: PartialProjectionType<AgentsDto> = {
    // entityId: 1,
    username: 1,
    displayName: 1,
    state: 1,
    hidden: 1,
  };

  public constructor(private readonly _service: AgentsService) {
    super();
  }

  @Post()
  @ApiCreateDecorator(AgentsCreateDto, AgentsDto)
  public async create(@Res() res: Response, @Body() body: AgentsCreateDto): Promise<Response> {
    const data = await this._service.create(body);
    return res.status(HttpStatus.CREATED).json({
      statusCode: HttpStatus.CREATED,
      data,
    });
  }

  @Get()
  @ApiPaginatedDecorator(PickProjectionHelper(AgentsDto, AgentsController.projection))
  public async search(
    @Res() res: Response,
    @SearchFilterSchema() searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response> {
    //TODO: search tree by parentId
    const [data, total] = await this._service.findAndCount(
      searchFilterSchema,
      AgentsController.projection,
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
  @ApiReadResponseDecorator(AgentsDto)
  public async read(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this._service.findById(_id, {
      password: 0,
    });
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
    });
  }

  @Patch(':_id([0-9a-fA-F]{24})')
  @ApiParam({ name: '_id', type: String })
  @ApiUpdateDecorator(AgentsUpdateDto, AgentsDto)
  public async update(
    @Param('_id', ObjectIdValidationPipe) _id: Types.ObjectId,
    @Body() body: AgentsUpdateDto,
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
  @ApiDeletedResponseDecorator(AgentsDto)
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
