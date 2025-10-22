import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Req,
  Res
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FilterOptions, SearchFilterOptions } from '~/_common/restools';
import { Request, Response } from 'express';
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
    @SearchFilterOptions() searchFilterOptions: FilterOptions,
  ): Promise<Response<Lifecycle[]>> {
    const [total, data] = await this._service.getLifecycleHistory(identityId, searchFilterOptions);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
      total,
    });
  }

  /**
   * Get lifecycle statistics
   *
   * @returns A response containing lifecycle statistics
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
   * Get all available lifecycle states
   *
   * @returns A response containing all available lifecycle states (default + custom)
   */
  @ApiOperation({
    summary: 'Get all available lifecycle states',
    description: 'Returns all lifecycle states including default states from enum and custom states from configuration'
  })
  @Get('states')
  public async getAllStates(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response<Array<{ key: string; label: string; description: string }>>> {
    // identifiant unique pour la derniere mise a jour du fichier states.yml
    // permet de savoir si le cache doit etre invalide
    const statesFileAge = this._service.stateFileAge;
    this.logger.debug(`Lifecycle states file age (ms since epoch): ${statesFileAge}`);

    const etag = `"${statesFileAge}"`;
    const ifNoneMatch = req.headers['if-none-match'];
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', new Date(statesFileAge).toUTCString());
    res.setHeader('Cache-Control', 'public, max-age=1, must-revalidate');

    if (ifNoneMatch === etag) {
      return res.status(HttpStatus.NOT_MODIFIED).send();
    }

    return res
      .status(HttpStatus.OK)
      .json({
        statusCode: HttpStatus.OK,
        data: this._service.getAllAvailableStates(),
      });
  }

  /**
   * Get only custom lifecycle states
   *
   * @returns A response containing only custom lifecycle states from configuration
   */
  @ApiOperation({
    summary: 'Get custom lifecycle states',
    description: 'Returns only custom lifecycle states loaded from states.yml configuration file'
  })
  @Get('states/custom')
  public async getCustomStates(
    @Res() res: Response,
  ): Promise<Response<Array<{ key: string; label: string; description: string }>>> {
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: this._service.getCustomStates(),
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
    const [total, data] = await this._service.getRecentChanges(searchFilterOptions);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data,
      total,
    });
  }
}
