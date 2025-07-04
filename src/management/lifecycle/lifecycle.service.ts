import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { Lifecycle, LifecycleDocument } from './_schemas/lifecycle.schema';
import { LifecycleCreateDto, LifecycleUpdateDto } from './_dto/lifecycle.dto';
import { IdentityLifecycle } from '~/management/identities/_enums/lifecycle.enum';
import { OnEvent } from '@nestjs/event-emitter';
import { Identities } from '../identities/_schemas/identities.schema';

@Injectable()
export class LifecycleService extends AbstractServiceSchema {
  protected _model: Model<LifecycleDocument>;

  public constructor(
    @InjectModel(Lifecycle.name) model: Model<LifecycleDocument>,
  ) {
    super();
    this._model = model;
  }

  @OnEvent('management.identities.service.afterUpsert')
  public async handleOrderCreatedEvent(event: { result: Identities, before?: Identities }): Promise<void> {
    this.logger.verbose(`Handling identity upsert event for identity <${event.result._id}>`);
    if (!event.result || !event.result._id) {
      this.logger.warn('No valid identity found in event data');
      return;
    }

    if (event.before && event.before.lifecycle === event.result.lifecycle) {
      this.logger.debug(`Lifecycle unchanged for identity <${event.result._id}>`);
      return;
    }

    await this._model.create({
      refId: event.result._id,
      lifecycle: event.result.lifecycle,
      date: new Date(),
    })
    this.logger.debug(`Lifecycle event recorded for identity <${event.result._id}>: ${event.result.lifecycle}`);
  }

  /**
   * Create a new lifecycle record
   */
  public async createLifecycle(dto: LifecycleCreateDto): Promise<Lifecycle> {
    const lifecycleData = {
      identityId: dto.identityId,
      lifecycle: dto.lifecycle,
      createdAt: new Date(),
    };

    const created = await this.create(lifecycleData);
    return created as unknown as Lifecycle;
  }

  /**
   * Update a lifecycle record
   */
  public async updateLifecycle(id: Types.ObjectId, dto: LifecycleUpdateDto): Promise<Lifecycle> {
    const updateData = {
      ...dto,
      updatedAt: new Date(),
    };

    const updated = await this.update(id, updateData);
    return updated.value as unknown as Lifecycle;
  }

  /**
   * Get lifecycle history for a specific identity
   */
  public async getLifecycleHistory(identityId: Types.ObjectId): Promise<Lifecycle[]> {
    const results = await this.find({ identityId }, null, { sort: { createdAt: -1 } });
    return results as unknown as Lifecycle[];
  }

  /**
   * Get current lifecycle status for an identity
   */
  public async getCurrentLifecycle(identityId: Types.ObjectId): Promise<Lifecycle | null> {
    try {
      const result = await this.findOne({ identityId }, null, { sort: { createdAt: -1 } });
      return result as unknown as Lifecycle;
    } catch (error) {
      return null;
    }
  }

  /**
   * Add a new lifecycle event for an identity
   */
  public async addLifecycleEvent(
    identityId: Types.ObjectId,
    lifecycle: IdentityLifecycle,
  ): Promise<Lifecycle> {
    const lifecycleData = {
      identityId,
      lifecycle,
      createdAt: new Date(),
    };

    const created = await this.create(lifecycleData);
    return created as unknown as Lifecycle;
  }

  /**
   * Get lifecycle statistics
   */
  public async getLifecycleStats(): Promise<any> {
    const stats = await this._model.aggregate([
      {
        $group: {
          _id: '$lifecycle',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return stats;
  }

  /**
   * Get recent lifecycle changes
   */
  public async getRecentChanges(limit: number = 10): Promise<Lifecycle[]> {
    const results = await this._model
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('identityId', 'inetOrgPerson.cn inetOrgPerson.mail')
      .exec();

    return results as unknown as Lifecycle[];
  }
}
