import { Controller, Get, HttpStatus, Param, Req, Res } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { FilterOptions, FilterSchema, SearchFilterOptions, SearchFilterSchema } from '@the-software-compagny/nestjs_module_restools';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { PickProjectionHelper } from '~/_common/helpers/pick-projection.helper';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { PartialProjectionType } from '~/_common/types/partial-projection.type';
import { JobsDto } from './_dto/jobs.dto';
import { JobsService } from './jobs.service';

@ApiTags('core/jobs')
@Controller('jobs')
export class JobsController extends AbstractController {
  protected static readonly projection: PartialProjectionType<JobsDto & { metadata: any }> = {
    jobId: 1,
    action: 1,
    concernedTo: 1,
    metadata: 1,
    params: 1,
    result: 1,
  };

  public constructor(private readonly _service: JobsService) {
    super();
  }

  @Get()
  @ApiPaginatedDecorator(PickProjectionHelper(JobsDto, JobsController.projection))
  public async search(
    @Res() res: Response,
    @Req() req: Request,
    @SearchFilterSchema({ unsafe: true }) searchFilterSchema: FilterSchema,
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response> {
    console.log('req', req.query)

    //TODO: search tree by parentId
    const [data, total] = await this._service.findAndCount(
      searchFilterSchema,
      JobsController.projection,
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
  @ApiReadResponseDecorator(JobsDto)
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
}
