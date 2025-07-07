import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { FilterOptions } from '@the-software-compagny/nestjs_module_restools';
import { Model, Query, Types } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { Identities } from '../identities/_schemas/identities.schema';
import { Lifecycle } from './_schemas/lifecycle.schema';

@Injectable()
export class LifecycleService extends AbstractServiceSchema {
  public constructor(@InjectModel(Lifecycle.name) protected _model: Model<Lifecycle>) {
    super();
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

    await this.create({
      refId: event.result._id,
      lifecycle: event.result.lifecycle,
      date: new Date(),
    });

    this.logger.debug(`Lifecycle event recorded for identity <${event.result._id}>: ${event.result.lifecycle}`);
  }

  /**
   * Get lifecycle history for a specific identity
   *
   * @param refId - The ID of the identity to retrieve lifecycle history for
   * @returns An array of lifecycle events for the specified identity, sorted by creation date in descending order
   */
  public async getLifecycleHistory(
    refId: Types.ObjectId,
    options?: FilterOptions,
  ): Promise<Query<Array<Lifecycle>, Lifecycle, any, Lifecycle>[]> {
    const result = await this.find<Lifecycle>({ refId }, null, {
      populate: 'refId',
      sort: {
        ...options?.sort,
        createdAt: -1,
      },
      skip: options?.skip || 0,
      limit: options?.limit || 100,
    });

    return result;
  }

  /**
   * Get lifecycle statistics
   * This method aggregates lifecycle events by their type and counts the occurrences.
   * It returns an array of objects where each object contains the lifecycle type and the count of occurrences.
   *
   * @returns An array of lifecycle statistics, each containing the lifecycle type and count
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
   * This method retrieves the most recent lifecycle changes, sorted by creation date in descending order.
   * It allows for pagination through the `skip` and `limit` options.
   *
   * @param options - Optional parameters for filtering, sorting, and pagination
   * @returns A promise that resolves to an array of lifecycle changes, each containing the lifecycle event details
   */
  public async getRecentChanges(
    options?: FilterOptions,
  ): Promise<Query<Array<Lifecycle>, Lifecycle, any, Lifecycle>[]> {
    const result = await this.find<Lifecycle>({}, null, {
      populate: 'refId',
      sort: {
        ...options?.sort,
        createdAt: -1,
      },
      skip: options?.skip || 0,
      limit: options?.limit || 100,
    });

    return result;
  }
}
