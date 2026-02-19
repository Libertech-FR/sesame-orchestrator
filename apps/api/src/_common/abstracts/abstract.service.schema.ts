import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Document,
  FilterQuery,
  Model,
  ModifyResult,
  MongooseBaseQueryOptions,
  ProjectionType,
  Query,
  QueryOptions,
  SaveOptions,
  Types,
  UpdateQuery,
} from 'mongoose';
import { EventEmitterSeparator } from '~/_common/constants/event-emitter.constant';
import { AbstractService, AbstractServiceContext } from './abstract.service';
import { ServiceSchemaInterface } from './interfaces/service.schema.interface';
import { AbstractSchema } from './schemas/abstract.schema';
import mongodb from 'mongodb';
import { omit } from 'radash';
import { cp } from 'fs';

@Injectable()
export abstract class AbstractServiceSchema extends AbstractService implements ServiceSchemaInterface {
  protected abstract _model: Model<AbstractSchema | Document>;

  protected constructor(context?: AbstractServiceContext) {
    super(context);
  }

  public get model(): Model<AbstractSchema | Document> {
    return this._model;
  }

  /* eslint-disable */
  public async find<T extends AbstractSchema | Document>(
    filter?: FilterQuery<T>,
    projection?: ProjectionType<T> | null | undefined,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<Query<Array<T>, T, any, T>[]> {
    if (this.eventEmitter) {
      const eventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'beforeFind'].join(EventEmitterSeparator)
      const beforeEvents = await this.eventEmitter?.emitAsync(
        eventName,
        { filter, projection, options, eventName },
      )
      for (const beforeEvent of beforeEvents) {
        if (beforeEvent?.stop) throw beforeEvent?.stop
        if (beforeEvent?.filter) filter = { ...filter, ...beforeEvent.filter }
        if (beforeEvent?.projection) projection = { ...(typeof projection === 'object' ? projection : {}), ...beforeEvent.projection }
        if (beforeEvent?.options) options = { ...options, ...beforeEvent.options }
      }
    }
    this.logger.debug(['find', JSON.stringify(Object.values(arguments))].join(' '))
    return await this._model.find<Query<Array<T>, T, any, T>>(filter, projection, options).exec()
  }

  public async count<T extends AbstractSchema | Document>(filter?: FilterQuery<T>, options?: (mongodb.CountOptions & MongooseBaseQueryOptions<T>) | null): Promise<number> {
    if (this.eventEmitter) {
      const eventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'beforeCount'].join(EventEmitterSeparator)
      const beforeEvents = await this.eventEmitter?.emitAsync(
        eventName,
        { filter, options, eventName },
      )
      for (const beforeEvent of beforeEvents) {
        if (beforeEvent?.stop) throw beforeEvent?.stop
        if (beforeEvent?.filter) filter = { ...filter, ...beforeEvent.filter }
        if (beforeEvent?.options) options = { ...options, ...beforeEvent.options }
      }
    }
    this.logger.debug(['count', JSON.stringify(Object.values(arguments))].join(' '))
    return await this._model.countDocuments(filter, options as any).exec()
  }

  public async trashAndCount<T extends AbstractSchema | Document>(
    projection?: ProjectionType<T> | null | undefined,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<[Array<T & Query<T, T, any, T>>, number]> {
    const filter = { deletedFlag: true }
    let count = await this._model.countDocuments(filter).exec()
    let data = await this._model.find<T & Query<T, T, any, T>>(filter, projection, options).exec()
    return [data, count]
  }
  public async findAndCount<T extends AbstractSchema | Document>(
    filter?: FilterQuery<T>,
    projection?: ProjectionType<T> | null | undefined,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<[Array<T & Query<T, T, any, T>>, number]> {
    this.logger.debug(['findAndCount', JSON.stringify(Object.values(arguments))].join(' '))
    if (this.eventEmitter) {
      const beforeEventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'beforeFindAndCount'].join(EventEmitterSeparator)
      const beforeEvents = await this.eventEmitter?.emitAsync(
        beforeEventName,
        { filter, projection, options, eventName: beforeEventName },
      )
      for (const beforeEvent of beforeEvents) {
        if (beforeEvent?.stop) throw beforeEvent?.stop
        if (beforeEvent?.filter) filter = { ...filter, ...beforeEvent.filter }
        if (beforeEvent?.projection) projection = { ...(typeof projection === 'object' ? projection : {}), ...beforeEvent.projection }
        if (beforeEvent?.options) options = { ...options, ...beforeEvent.options }
      }
    }
    const softDelete = { deletedFlag: { $ne: true } }
    filter = { ...filter, ...softDelete }
    let count = await this._model.countDocuments(filter).exec()
    let data = await this._model.find<T & Query<T, T, any, T>>(filter, projection, options).exec()

    if (this.eventEmitter) {
      const eventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'afterFindAndCount'].join(EventEmitterSeparator)
      const afterEvents = await this.eventEmitter?.emitAsync(
        eventName,
        { data, count, eventName },
      )
      for (const afterEvent of afterEvents) {
        if (afterEvent?.data) data = { ...data, ...afterEvent.data }
        if (afterEvent?.count) count += afterEvent.count
      }
    }

    return [data, count]
  }

  public async findById<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    projection?: ProjectionType<T> | null | undefined,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<Query<T, T, any, T>> {
    this.logger.debug(['findById', JSON.stringify(Object.values(arguments))].join(' '))

    if (this.eventEmitter) {
      const beforeEventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'beforeFindById'].join(EventEmitterSeparator)
      const beforeEvents = await this.eventEmitter?.emitAsync(
        beforeEventName,
        { _id, projection, options, eventName: beforeEventName },
      )
      for (const beforeEvent of beforeEvents) {
        if (beforeEvent?.stop) throw beforeEvent?.stop
        if (beforeEvent?.projection) projection = { ...(typeof projection === 'object' ? projection : {}), ...beforeEvent.projection }
        if (beforeEvent?.options) options = { ...options, ...beforeEvent.options }
      }
    }

    let data = await this._model.findById<Query<T | null, T, any, T>>(_id, projection, options).exec()

    if (this.eventEmitter) {
      const eventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'afterFindById'].join(EventEmitterSeparator)
      const afterEvents = await this.eventEmitter?.emitAsync(
        eventName,
        { data, eventName },
      )
      for (const afterEvent of afterEvents) {
        if (afterEvent?.data) data = { ...data, ...afterEvent.data }
      }
    }

    if (!data) {
      this.logger.debug(['findById', JSON.stringify(Object.values(arguments))].join(' '))
      throw new NotFoundException()
    }
    return data
  }

  public async findOne<T extends AbstractSchema | Document>(
    filter?: FilterQuery<T>,
    projection?: ProjectionType<T> | null | undefined,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<Query<T, T, any, T>> {
    this.logger.debug(['findOne', JSON.stringify(Object.values(arguments))].join(' '))
    if (this.eventEmitter) {
      const beforeEventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'beforeFindOne'].join(EventEmitterSeparator)
      const beforeEvents = await this.eventEmitter?.emitAsync(
        beforeEventName,
        { filter, projection, options, eventName: beforeEventName },
      )
      for (const beforeEvent of beforeEvents) {
        if (beforeEvent?.stop) throw beforeEvent?.stop
        if (beforeEvent?.filter) filter = { ...filter, ...beforeEvent.filter }
        if (beforeEvent?.projection) projection = { ...(typeof projection === 'object' ? projection : {}), ...beforeEvent.projection }
        if (beforeEvent?.options) options = { ...options, ...beforeEvent.options }
      }
    }
    let data = await this._model.findOne<Query<T | null, T, any, T>>(filter, projection, options).exec()
    if (!data) {
      this.logger.debug(['findById', JSON.stringify(Object.values(arguments))].join(' '))
      throw new NotFoundException()
    }
    if (this.eventEmitter) {
      const eventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'afterFindOne'].join(EventEmitterSeparator)
      const afterEvents = await this.eventEmitter?.emitAsync(
        eventName,
        { data, eventName },
      )
      for (const afterEvent of afterEvents) {
        if (afterEvent?.data) data = { ...data, ...afterEvent.data }
      }
    }
    return data
  }

  public async create<T extends AbstractSchema | Document>(data?: any, options?: SaveOptions): Promise<Document<T, any, T>> {
    const logInfos = Object.values({
      ...arguments,
      1: {
        ...arguments[1],
        session: typeof arguments[1] === 'object' && 'session' in arguments[1] ? 'session' : undefined,
      },
    })
    this.logger.debug(['create', JSON.stringify(logInfos)].join(' '))
    if (this.eventEmitter) {
      const beforeEventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'beforeCreate'].join(EventEmitterSeparator)
      const beforeEvents = await this.eventEmitter?.emitAsync(
        beforeEventName,
        { data, options, eventName: beforeEventName },
      )
      for (const beforeEvent of beforeEvents) {
        if (beforeEvent?.stop) throw beforeEvent?.stop
        if (beforeEvent?.data) data = { ...data, ...beforeEvent.data }
        if (beforeEvent?.options) options = { ...options, ...beforeEvent.options }
      }
    }
    const document = new this._model<T>({
      metadata: {
        createdBy: this.request?.user?.username || 'anonymous',
        createdAt: new Date(),
        lastUpdatedBy: this.request?.user?.username || 'anonymous',
        lastUpdatedAt: new Date(),
      },
      ...data,
    })
    let created = document.save(options)
    if (this.eventEmitter) {
      const eventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'afterCreate'].join(EventEmitterSeparator)
      const afterEvents = await this.eventEmitter?.emitAsync(
        eventName,
        { created, eventName },
      )
      for (const afterEvent of afterEvents) {
        if (afterEvent?.created) created = { ...created, ...afterEvent.created }
      }
    }
    return created as unknown as Document<T, any, T>
  }

  public async update<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    update: UpdateQuery<T>,
    options?: QueryOptions<T>,
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    const logInfos = Object.values({
      ...arguments,
      2: {
        ...arguments[2],
        session: typeof arguments[2] === 'object' && 'session' in arguments[2] ? 'session' : undefined,
      },
    })
    this.logger.debug(['update', JSON.stringify(logInfos)].join(' '))
    if (this.eventEmitter) {
      const beforeEventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'beforeUpdate'].join(EventEmitterSeparator)
      const beforeEvents = await this.eventEmitter?.emitAsync(
        beforeEventName,
        { _id, update, options, eventName: beforeEventName },
      )
      for (const beforeEvent of beforeEvents) {
        if (beforeEvent?.stop) throw beforeEvent?.stop
        if (beforeEvent?.data) update = { ...update, ...beforeEvent.update }
        if (beforeEvent?.options) options = { ...options, ...beforeEvent.options }
      }
    }
    const before = await this._model.findOne<Query<T | null, T, any, T>>({ _id }).exec();
    let updated = await this._model
      .findOneAndUpdate<Query<T | null, T, any, T>>(
        { _id },
        {
          ...update,
          $setOnInsert: {
            'metadata.createdBy': this.request?.user?.username || 'anonymous',
            'metadata.createdAt': new Date(),
          },
          $set: {
            ...omit(update?.$set || {}, ['_id']),
            'metadata.lastUpdatedBy': this.request?.user?.username || 'anonymous',
            'metadata.lastUpdatedAt': new Date(),
          }
        },
        {
          new: true,
          runValidators: true,
          ...options,
        } as QueryOptions<T> & { includeResultMetadata: true },
      )
      .exec()
    if (!updated) {
      this.logger.debug(['findById', JSON.stringify(Object.values(arguments))].join(' '))
      throw new NotFoundException()
    }
    if (this.eventEmitter) {
      const eventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'afterUpdate'].join(EventEmitterSeparator)
      const afterEvents = await this.eventEmitter?.emitAsync(
        eventName,
        { before, updated, eventName },
      )
      for (const afterEvent of afterEvents) {
        if (afterEvent?.updated) updated = { ...updated, ...afterEvent.updated }
      }
    }
    return updated
  }

  public async upsert<T extends AbstractSchema | Document>(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions<T>
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    this.logger.debug(['upsert', JSON.stringify(Object.values(arguments))].join(' '));
    if (this.eventEmitter) {
      const beforeEventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'beforeUpsert'].join(EventEmitterSeparator);
      const beforeEvents = await this.eventEmitter?.emitAsync(
        beforeEventName,
        { filter, update, options, eventName: beforeEventName },
      );
      for (const beforeEvent of beforeEvents) {
        if (beforeEvent?.stop) throw beforeEvent?.stop;
        if (beforeEvent?.filter) filter = { ...filter, ...beforeEvent.filter };
        if (beforeEvent?.update) update = { ...update, ...beforeEvent.update };
        if (beforeEvent?.options) options = { ...options, ...beforeEvent.options };
      }
    }
    const before = await this._model.findOne<Query<T | null, T, any, T>>(filter).exec();
    let result = await this._model
      .findOneAndUpdate<Query<T | null, T, any, T>>(
        filter,
        {
          ...update,
          $setOnInsert: {
            ...(update?.$setOnInsert || {}),
            'metadata.createdBy': this.request?.user?.username || 'anonymous',
            'metadata.createdAt': new Date(),
          },
          $set: {
            ...(update?.$set || {}),
            'metadata.lastUpdatedBy': this.request?.user?.username || 'anonymous',
            'metadata.lastUpdatedAt': new Date(),
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          ...options,
        } as QueryOptions<T> & { includeResultMetadata: true },
      )
      .exec();

    if (this.eventEmitter) {
      const eventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'afterUpsert'].join(EventEmitterSeparator)
      const afterEvents = await this.eventEmitter?.emitAsync(
        eventName,
        { result, before, eventName },
      );
      for (const afterEvent of afterEvents) {
        if (afterEvent?.result) result = { ...result, ...afterEvent.result };
      }
    }

    if (!result) {
      throw new NotFoundException();
    }

    return result;
  }


  public async delete<T extends AbstractSchema | Document>(_id: Types.ObjectId | any, options?: QueryOptions<T> | null | undefined): Promise<Query<T, T, any, T>> {
    this.logger.debug(['delete', JSON.stringify(Object.values(arguments))].join(' '))
    if (this.eventEmitter) {
      const beforeEventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'beforeDelete'].join(EventEmitterSeparator)
      const beforeEvents = await this.eventEmitter?.emitAsync(
        beforeEventName,
        { _id, options, eventName: beforeEventName },
      )
      for (const beforeEvent of beforeEvents) {
        if (beforeEvent?.stop) throw beforeEvent?.stop
        if (beforeEvent?.options) options = { ...options, ...beforeEvent.options }
      }
    }
    const before = await this._model.findOne<Query<T | null, T, any, T>>({ _id }).exec();
    let deleted = await this._model.findByIdAndDelete<Query<T | null, T, any, T>>({ _id }, options).exec()
    if (!deleted) {
      this.logger.debug(['findById', JSON.stringify(Object.values(arguments))].join(' '))
      throw new NotFoundException()
    }
    if (this.eventEmitter) {
      const eventName = [this.moduleName.toLowerCase(), this.serviceName.toLowerCase(), 'service', 'afterDelete'].join(EventEmitterSeparator)
      const afterEvents = await this.eventEmitter?.emitAsync(
        eventName,
        { before, deleted, eventName },
      )
      for (const afterEvent of afterEvents) {
        if (afterEvent?.deleted) deleted = { ...deleted, ...afterEvent.deleted }
      }
    }
    return deleted
  }

  /* eslint-enable */
}
