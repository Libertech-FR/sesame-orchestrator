import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Res
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FilterOptions, SearchFilterOptions } from '@the-software-compagny/nestjs_module_restools';
import { Response } from 'express';
import { Types } from 'mongoose';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { Lifecycle } from './_schemas/lifecycle.schema';
import { LifecycleService } from './lifecycle.service';

@ApiTags('management/lifecycle')
@Controller('lifecycle')
export class LifecycleController extends AbstractController {
  public constructor(
    protected readonly _service: LifecycleService,
  ) {
    super();
  }

  /**
   * Get lifecycle history for an identity
   *
   * @param identityId - The ID of the identity to retrieve lifecycle history for
   * @returns A response containing the lifecycle history of the specified identity
   */
  @ApiOperation({ summary: 'Get lifecycle history for an identity' })
  @ApiParam({ name: 'identityId', description: 'Identity ID' })
  @Get('identity/:identityId')
  public async getLifecycleHistory(
    @Param('identityId', ObjectIdValidationPipe) identityId: Types.ObjectId,
    @Res() res: Response,
  ): Promise<Response<Lifecycle[]>> {
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: await this._service.getLifecycleHistory(identityId),
    });
  }

  /**
   * Get lifecycle history for an agent
   *
   * @param agentId - The ID of the agent to retrieve lifecycle history for
   * @returns A response containing the lifecycle history of the specified agent
   */
  @ApiOperation({ summary: 'Get lifecycle statistics' })
  @Get('stats')
  public async getStats(
    @Res() res: Response,
  ): Promise<Response<Lifecycle[]>> {
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: await this._service.getLifecycleStats(),
    });
  }

  /**
   * Get recent lifecycle changes
   *
   * @returns A response containing the recent lifecycle changes
   */
  @ApiOperation({ summary: 'Get recent lifecycle changes' })
  @Get('recent')
  public async getRecentChanges(
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
    @Res() res: Response,
  ): Promise<Response<Lifecycle[]>> {
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: await this._service.getRecentChanges(searchFilterOptions),
    });
  }
}
