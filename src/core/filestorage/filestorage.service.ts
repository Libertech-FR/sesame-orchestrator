import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { FactorydriveService } from '~/_common/factorydrive';
import {
  Document,
  FilterQuery,
  Model,
  ModifyResult,
  ProjectionType,
  Query,
  QueryOptions,
  SaveOptions,
  Types,
  UpdateQuery,
} from 'mongoose';
import { createHash } from 'node:crypto';
import { omit } from 'radash';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { FilestorageCreateDto } from '~/core/filestorage/_dto/filestorage.dto';
import { FsType } from '~/core/filestorage/_enum/fs-type.enum';
import { Filestorage } from './_schemas/filestorage.schema';

export const EMBED_SEPARATOR = '#';

function hasFileExtension(path: string): boolean {
  const regex = /\.\w+$/;
  return regex.test(path);
}

@Injectable(/*{ scope: Scope.REQUEST }*/)
export class FilestorageService extends AbstractServiceSchema {
  protected readonly reservedChars = ['\\', '?', '%', '*', ':', '|', '"', '<', '>', '#'];

  public constructor(
    protected readonly moduleRef: ModuleRef,
    @InjectModel(Filestorage.name) protected _model: Model<Filestorage & Document>,
    protected readonly storage: FactorydriveService,
  ) {
    // @Inject(REQUEST) protected req?: Request & { user?: Express.User },
    super({ moduleRef /*, req*/ });
  }

  /* eslint-disable */
  public async create<T extends AbstractSchema | Document>(
    data?: FilestorageCreateDto & { file?: Express.Multer.File },
    options?: SaveOptions & { checkFilestorageLinkedTo?: boolean },
  ): Promise<Document<T, any, T>> {
    const file = data.file
    if (file && data.type !== FsType.FILE) throw new BadRequestException(`Type must be ${FsType.FILE}`)
    try {
      let payload: FilestorageCreateDto = { ...omit(data, ['file']) }
      const basePath = this.reservedChars.reduce((acc, char) => {
        if (char === EMBED_SEPARATOR) return acc
        return acc.replace(char, '_')
      }, payload.path.replace(/(?<!^)\/{2,}|(?<!\/)\/+$/, ''))
      const partPath = [basePath]
      // noinspection ExceptionCaughtLocallyJS
      switch (data.type) {
        case FsType.FILE: {
          if (!basePath || !hasFileExtension(basePath)) {
            partPath.push(file.originalname)
          }
          const exists = await this.storage.getDisk(data.namespace).exists(partPath.join('/'))
          if (exists.exists) {
            throw new BadRequestException(`File ${partPath.join('/')} already exists`)
          }
          payload.mime = data.mime || file.mimetype
          await this.storage.getDisk(data.namespace).put(partPath.join('/'), file.buffer)
          break
        }
      }

      const fingerprint = createHash('sha256');
      fingerprint.update(file.buffer);
      payload.fingerprint = fingerprint.digest('hex').toString();
      payload.path = partPath.join('/')

      return super.create(payload, options)
    } catch (e) {
      if (e.code === 'E_INVALID_CONFIG') {
        throw new BadRequestException(`Namespace ${data.namespace} not found`)
      }
      throw e
    }
  }

  public async findById<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    projection?: ProjectionType<T> | null | undefined,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<Query<T, T, any, T>> {
    const data = await super.findById<Document<any, any, Filestorage> & Filestorage>(_id, projection, options)
    if (data.type === FsType.FILE) {
      const storageRequest = await this.storage.getDisk(data.namespace).exists(data.path)
      if (!storageRequest.exists) this.logger.warn(`Filestorage ${data._id} not found in storage`)
      return {
        ...data.toObject(),
        _exists: storageRequest.exists,
      } as any
    }
    return data.toObject() as any
  }

  public async findByIdWithRawData<T extends Filestorage | Document>(
    _id: Types.ObjectId | any,
    projection?: ProjectionType<T> | null | undefined,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<[Document<any, any, Filestorage> & Filestorage, NodeJS.ReadableStream | null, (Document<any, any, Filestorage> & Filestorage) | null]> {
    const data = await super.findById<Document<any, any, Filestorage> & Filestorage>(_id, projection, options)
    if (data.type === FsType.FILE) {
      const stream = await this.storage.getDisk(data.namespace).getStream(data.path)
      return [data, stream, null]
    }
    return [data, null, null]
  }

  public async findOne<T extends AbstractSchema | Document>(
    filter?: FilterQuery<T>,
    projection?: ProjectionType<T> | null | undefined,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<Query<T, T, any, T>> {
    const data = await super.findOne<Document<any, any, Filestorage> & Filestorage>(filter, projection, options)
    if (data.type === FsType.FILE) {
      const storageRequest = await this.storage.getDisk(data.namespace).exists(data.path)
      if (!storageRequest.exists) this.logger.warn(`Filestorage ${data._id} not found in storage`)
      return {
        ...data.toObject(),
        _exists: storageRequest.exists,
      } as any
    }
    return data.toObject() as any
  }

  public async findOneWithRawData<T extends Filestorage | Document>(
    filter?: FilterQuery<T>,
    projection?: ProjectionType<T> | null | undefined,
    options?: QueryOptions<T> | null | undefined,
  ): Promise<[Document<any, any, Filestorage> & Filestorage, NodeJS.ReadableStream | null, (Document<any, any, Filestorage> & Filestorage) | null]> {
    const data = await super.findOne<Document<any, any, Filestorage> & Filestorage>(filter, projection, options)
    if (data.type === FsType.FILE) {
      const storageRequest = await this.storage.getDisk(data.namespace).exists(data.path)
      if (!storageRequest.exists) {
        this.logger.warn(`Filestorage ${data._id} not found in storage`)
        throw new NotFoundException(`Filestorage ${data._id} not found in storage`)
      }
      const stream = await this.storage.getDisk(data.namespace).getStream(data.path)
      return [data, stream, null]
    }
    return [data, null, null]
  }

  public async update<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    update: UpdateQuery<T>,
    options?: QueryOptions<T> & { rawResult: true },
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    let updated: ModifyResult<Query<T, T, any, T>>
    const data = await super.findById<Document<any, any, Filestorage> & Filestorage>(_id)
    if (!data) throw new BadRequestException(`Filestorage ${_id} not found`)

    if (update.path && data.path !== update.path) {
      await this._model.db.transaction(async (session) => {
        updated = await super.update(_id, update, { ...options, session })
        try {
          await this.storage.getDisk(data.namespace).move(data.path, update.path)
        } catch (e) {
          if (e.code === 'E_UNKNOWN') {
            const err = new BadRequestException(`Impossible de déplacer le fichier ${data.path} vers ${update.path}`)
            err.stack = e.stack
            throw err
          }
          throw e
        }
      })
    } else {
      updated = await super.update(_id, update, options)
    }

    return updated
  }

  public async upsertFile<T extends AbstractSchema | Document>(
    filter?: FilterQuery<T>,
    data?: FilestorageCreateDto & { file?: Express.Multer.File },
    options?: QueryOptions<T> & { rawResult: true },
  ) {
    let stored: Document<any, any, Filestorage> & Filestorage
    try {
      stored = (await this.findOne<Filestorage>(filter, options)) as any
    } catch (e) {
      if (e.status !== HttpStatus.NOT_FOUND) throw e
    }

    if (stored) {
      const update = { ...omit(data, ['file']) }

      const fingerprint = createHash('sha256');
      fingerprint.update(data.file.buffer);
      update.fingerprint = fingerprint.digest('hex').toString();

      await this.checkFingerprint(
        { _id: stored._id },
        update.fingerprint,
      )

      const updated = await this.update(stored._id, update, options)
      this.storage.getDisk(stored.namespace).put(stored.path, data.file.buffer)

      return updated
    } else {
      return await this.create(data, options)
    }
  }

  public async checkFingerprint<T extends AbstractSchema | Document>(
    filters: FilterQuery<T>,
    fingerprint: string,
  ): Promise<void> {
    const file = await this.model
      .findOne(
        { ...filters, fingerprint },
        {
          _id: 1,
        },
      )
      .exec();
    if (file) {
      this.logger.debug(`Fingerprint matched for <${file._id}> (${fingerprint}).`);
      throw new HttpException('Fingerprint matched.', HttpStatus.NOT_MODIFIED);
    }
  }
  /* eslint-enable */
}
