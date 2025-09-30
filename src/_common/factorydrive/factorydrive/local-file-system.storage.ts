import * as fse from 'fs-extra'
import { promises as fs } from 'fs'
import { dirname, join, relative, resolve, sep } from 'path'
import AbstractStorage from './abstract.storage'
import { isReadableStream, pipeline } from './utils'
import { FileNotFoundException, PermissionMissingException, UnknownException } from '../exceptions'
import { ContentResponse, DeleteResponse, ExistsResponse, FileListResponse, Response, StatResponse } from './types'

function handleError(err: Error & { code: string; path?: string }, location: string): Error {
  switch (err.code) {
    case 'ENOENT': {
      return new FileNotFoundException(err, location)
    }
    case 'EPERM': {
      return new PermissionMissingException(err, location)
    }
    default: {
      return new UnknownException(err, err.code, location)
    }
  }
}

export class LocalFileSystemStorage extends AbstractStorage {
  private readonly $root: string

  public constructor(config: LocalFileSystemStorageConfig) {
    super()
    this.$root = resolve(config.root)
  }

  private _fullPath(relativePath: string): string {
    return join(this.$root, join(sep, relativePath))
  }

  public async append(location: string, content: Buffer | string): Promise<Response> {
    try {
      const result = await fse.appendFile(this._fullPath(location), content)
      return { raw: result }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public async copy(src: string, dest: string): Promise<Response> {
    try {
      const result = await fse.copy(this._fullPath(src), this._fullPath(dest))
      return { raw: result }
    } catch (e) {
      throw handleError(e, `${src} -> ${dest}`)
    }
  }

  public async delete(location: string): Promise<DeleteResponse> {
    try {
      const result = await fse.unlink(this._fullPath(location))
      return { raw: result, wasDeleted: true }
    } catch (e) {
      e = handleError(e, location)

      if (e instanceof FileNotFoundException) {
        return { raw: undefined, wasDeleted: false }
      }

      throw e
    }
  }

  public driver(): typeof fse {
    return fse
  }

  public async exists(location: string): Promise<ExistsResponse> {
    try {
      const result = await fse.pathExists(this._fullPath(location))
      return { exists: result, raw: result }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public async get(location: string, encoding: BufferEncoding = 'utf-8'): Promise<ContentResponse<string>> {
    try {
      const result = await fse.readFile(this._fullPath(location), { encoding })
      return { content: result.toString(), raw: result }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public async getBuffer(location: string): Promise<ContentResponse<Buffer>> {
    try {
      const result = await fse.readFile(this._fullPath(location))
      return { content: result, raw: result }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public async getStat(location: string): Promise<StatResponse> {
    try {
      const stat = await fse.stat(this._fullPath(location))
      return {
        size: stat.size,
        modified: stat.mtime,
        raw: stat,
      }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public getStream(location: string): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve) => {
      resolve(fse.createReadStream(this._fullPath(location)))
    })
  }

  public async move(src: string, dest: string): Promise<Response> {
    try {
      const result = await fse.move(this._fullPath(src), this._fullPath(dest))
      return { raw: result }
    } catch (e) {
      throw handleError(e, `${src} -> ${dest}`)
    }
  }

  public async prepend(location: string, content: Buffer | string): Promise<Response> {
    try {
      const { content: actualContent } = await this.get(location, 'utf-8')

      return this.put(location, `${content}${actualContent}`)
    } catch (e) {
      if (e instanceof FileNotFoundException) {
        return this.put(location, content)
      }
      throw e
    }
  }

  public async put(location: string, content: Buffer | NodeJS.ReadableStream | string): Promise<Response> {
    const fullPath = this._fullPath(location)

    try {
      if (isReadableStream(content)) {
        const dir = dirname(fullPath)
        await fse.ensureDir(dir)
        const ws = fse.createWriteStream(fullPath)
        await pipeline(content, ws)
        return { raw: undefined }
      }

      const result = await fse.outputFile(fullPath, content)
      return { raw: result }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public flatList(prefix = ''): AsyncIterable<FileListResponse> {
    const fullPrefix = this._fullPath(prefix)
    return this._flatDirIterator(fullPrefix, prefix)
  }

  private async *_flatDirIterator(prefix: string, originalPrefix: string): AsyncIterable<FileListResponse> {
    const prefixDirectory = prefix[prefix.length - 1] === sep ? prefix : dirname(prefix)

    try {
      const dir = await fs.opendir(prefixDirectory)

      for await (const file of dir) {
        const fileName = join(prefixDirectory, file.name)
        if (fileName.startsWith(prefix)) {
          if (file.isDirectory()) {
            yield* this._flatDirIterator(join(fileName, sep), originalPrefix)
          } else if (file.isFile()) {
            const path = relative(this.$root, fileName)
            yield {
              raw: null,
              path,
            }
          }
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw handleError(e, originalPrefix)
      }
    }
  }
}

export type LocalFileSystemStorageConfig = {
  root: string
}
