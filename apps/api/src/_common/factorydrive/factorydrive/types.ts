import { LocalFileSystemStorageConfig } from './local-file-system.storage'

export type { LocalFileSystemStorageConfig }

export type StorageManagerSingleDiskConfig =
  | {
      driver: 'local'
      config: LocalFileSystemStorageConfig
    }
  | {
      driver: string
      config: unknown
    }

export interface StorageManagerDiskConfig {
  [key: string]: StorageManagerSingleDiskConfig
}

export interface StorageManagerConfig {
  default?: string
  disks?: StorageManagerDiskConfig
  registerLocalDriver?: boolean
}

export interface Response {
  raw: unknown
}

export interface ExistsResponse extends Response {
  exists: boolean
}

export interface ContentResponse<ContentType> extends Response {
  content: ContentType
}

export interface SignedUrlOptions {
  expiresIn?: number
}

export interface SignedUrlResponse extends Response {
  signedUrl: string
}

export interface StatResponse extends Response {
  size: number
  modified: Date
}

export interface FileListResponse extends Response {
  path: string
}

export interface DeleteResponse extends Response {
  wasDeleted: boolean | null
}
