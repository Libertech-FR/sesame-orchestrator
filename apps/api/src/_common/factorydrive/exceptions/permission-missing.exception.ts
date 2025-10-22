import { RuntimeException } from 'node-exceptions'

export class PermissionMissingException extends RuntimeException {
  public raw: Error

  public constructor(err: Error, path: string) {
    super(`Missing permission for file ${path}\n${err.message}`, 500, 'E_PERMISSION_MISSING')
    this.raw = err
  }
}
