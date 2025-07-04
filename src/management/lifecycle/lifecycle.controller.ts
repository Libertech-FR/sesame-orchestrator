import {
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
import { Response } from 'express';
import { Types } from 'mongoose';
import { AbstractController } from '~/_common/abstracts/abstract.controller';
import { ApiCreateDecorator } from '~/_common/decorators/api-create.decorator';
import { ApiPaginatedDecorator } from '~/_common/decorators/api-paginated.decorator';
import { ApiReadResponseDecorator } from '~/_common/decorators/api-read-response.decorator';
import { ApiUpdateDecorator } from '~/_common/decorators/api-update.decorator';
import { ObjectIdValidationPipe } from '~/_common/pipes/object-id-validation.pipe';
import { LifecycleCreateDto, LifecycleDto, LifecycleUpdateDto } from './_dto/lifecycle.dto';
import { LifecycleService } from './lifecycle.service';

@ApiTags('management/lifecycle')
@Controller('lifecycle')
export class LifecycleController extends AbstractController {
  public constructor(
    protected readonly _service: LifecycleService,
  ) {
    super();
  }

  @ApiOperation({ summary: 'Create a new lifecycle record' })
  @ApiCreateDecorator(LifecycleCreateDto, LifecycleDto)
  @Post()
  public async create(
    @Body() dto: LifecycleCreateDto,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const result = await this._service.createLifecycle(dto);
      response.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  }

  @ApiOperation({ summary: 'Get all lifecycle records' })
  @ApiPaginatedDecorator(LifecycleDto)
  @Get()
  public async findAll(
    @Res() response: Response,
  ): Promise<void> {
    try {
      const result = await this._service.find();
      response.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  }

  @ApiOperation({ summary: 'Get lifecycle record by ID' })
  @ApiParam({ name: 'id', description: 'Lifecycle ID' })
  @ApiReadResponseDecorator(LifecycleDto)
  @Get(':id')
  public async findOne(
    @Param('id', ObjectIdValidationPipe) id: Types.ObjectId,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const result = await this._service.findById(id);
      response.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  }

  @ApiOperation({ summary: 'Update lifecycle record' })
  @ApiParam({ name: 'id', description: 'Lifecycle ID' })
  @ApiUpdateDecorator(LifecycleUpdateDto, LifecycleDto)
  @Patch(':id')
  public async update(
    @Param('id', ObjectIdValidationPipe) id: Types.ObjectId,
    @Body() dto: LifecycleUpdateDto,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const result = await this._service.updateLifecycle(id, dto);
      response.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  }

  @ApiOperation({ summary: 'Delete lifecycle record' })
  @ApiParam({ name: 'id', description: 'Lifecycle ID' })
  @Delete(':id')
  public async remove(
    @Param('id', ObjectIdValidationPipe) id: Types.ObjectId,
    @Res() response: Response,
  ): Promise<void> {
    try {
      await this._service.delete(id);
      response.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, response);
    }
  }

  @ApiOperation({ summary: 'Get lifecycle history for an identity' })
  @ApiParam({ name: 'identityId', description: 'Identity ID' })
  @Get('identity/:identityId')
  public async getLifecycleHistory(
    @Param('identityId', ObjectIdValidationPipe) identityId: Types.ObjectId,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const result = await this._service.getLifecycleHistory(identityId);
      response.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  }

  @ApiOperation({ summary: 'Get lifecycle statistics' })
  @Get('stats')
  public async getStats(
    @Res() response: Response,
  ): Promise<void> {
    try {
      const result = await this._service.getLifecycleStats();
      response.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  }

  @ApiOperation({ summary: 'Get recent lifecycle changes' })
  @Get('recent')
  public async getRecentChanges(
    @Res() response: Response,
  ): Promise<void> {
    try {
      const result = await this._service.getRecentChanges();
      response.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  }

  private handleError(error: any, response: Response): void {
    console.error('Lifecycle Controller Error:', error);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'An error occurred while processing the request',
      error: error.message,
    });
  }
}
