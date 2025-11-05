import { Abstract, DynamicModule, ForwardReference, Provider, Type } from '@nestjs/common'
import path from 'node:path'

export function isConsoleEntrypoint(): boolean {
  const entry =
    (require?.main?.filename ?? process.argv[1] ?? '').toLowerCase()
  const base = path.basename(entry)
  return /^(console)\.(t|j)s$/.test(base)
}

export function useOnCli<
  T = Provider
  | (Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference<any>)
  | (string | symbol | Function | Provider | DynamicModule | Promise<DynamicModule> | ForwardReference<any> | Abstract<any>),
>(items: T | T[]): T[] {
  if (isConsoleEntrypoint()) {
    return items instanceof Array ? items : [items]
  }
  return []
}
