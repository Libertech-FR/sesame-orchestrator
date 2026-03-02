import { applyDecorators, SetMetadata } from '@nestjs/common'
import { UseRoles as AccessControlUseRoles } from 'nest-access-control'

export const META_AC_RULE = 'ac:rule'

export type AcRule = {
  resource: string
  action: string
  possession?: string
}

export const UseRoles = (rule: AcRule) =>
  applyDecorators(
    AccessControlUseRoles(rule as any),
    SetMetadata(META_AC_RULE, rule),
  )
