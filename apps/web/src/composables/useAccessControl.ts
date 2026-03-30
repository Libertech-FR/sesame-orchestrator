import { AccessControl, Permission } from 'accesscontrol'

export interface AccessObjectActionPermission {
  'create:any'?: boolean
  'read:any'?: boolean
  'update:any'?: boolean
  'delete:any'?: boolean
  'create:own'?: boolean
  'read:own'?: boolean
  'update:own'?: boolean
  'delete:own'?: boolean
}

export interface AccessObjectAction {
  [key: string]: AccessObjectActionPermission
}

export interface AccessObject {
  [key: string]: AccessObjectAction
}

export enum AccessControlPossession {
  ANY = 'Any',
  OWN = 'Own',
}

export enum AccessControlAction {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  UPDATE = 'update',
  CREATE = 'create',
}

export const AC_ADMIN_ROLE = 'admin'
export const AC_GUEST_ROLE = 'guest'

export const AC_DEFAULT_ATTRIBUTES = ['*']

export type AccessPermission = Pick<Permission, 'roles' | 'resource' | 'attributes' | 'granted' | 'filter'>

let initializedAccessControl: AccessControl | null = null
let initializedAccess: AccessObject | null = null

function getInitializedAccessControl(access: AccessObject): AccessControl {
  if (!initializedAccessControl || initializedAccess !== access) {
    initializedAccessControl = new AccessControl(access)
    initializedAccess = access
  }

  return initializedAccessControl
}

export const useAccessControl = () => {
  const { $auth } = useNuxtApp()
  const roles = $auth.user?.roles as string[] || []
  const access = $auth.user?.access as AccessObject || {}

  const accessControl = getInitializedAccessControl(access)

  const resolveEffectiveRoles = (inputRoles: string[]): string[] => {
    const result = new Set<string>()
    const visiting = new Set<string>()

    const visit = (role: string) => {
      if (!role || result.has(role)) return
      if (visiting.has(role)) return
      visiting.add(role)
      result.add(role)

      const grants = access?.[role] as any
      const extend = grants?.$extend
      if (Array.isArray(extend)) {
        for (const parent of extend) {
          if (typeof parent === 'string') {
            visit(parent)
          }
        }
      }

      visiting.delete(role)
    }

    for (const r of inputRoles) {
      if (typeof r === 'string') visit(r)
    }

    return [...result]
  }

  function getPermission(
    resource: string,
    action: string,
    possession?: AccessControlPossession | string,
  ): AccessPermission | null {
    if (!roles.length) {
      return null
    }

    if (roles.includes(AC_ADMIN_ROLE)) {
      return {
        roles,
        resource,
        attributes: AC_DEFAULT_ATTRIBUTES,
        granted: true,
        filter: (data: Record<string, unknown>) => data,
      }
    }

    const normalizedPossession = possession || AccessControlPossession.ANY
    const query = accessControl.can(roles) as unknown as Record<string, unknown>
    const methodName = action + normalizedPossession
    const permissionMethod = query[methodName]

    if (typeof permissionMethod !== 'function') {
      return null
    }

    const permission = (query[methodName] as (resource: string) => AccessPermission)(resource)

    return permission
  }

  function hasPermission(
    resource: string,
    action: string,
    possession?: AccessControlPossession | string,
  ): boolean {
    const permission = getPermission(resource, action, possession)

    return permission?.granted || false
  }

  function getAttributes(
    resource: string,
    action: string,
    possession?: AccessControlPossession | string,
  ): string[] {
    const permission = getPermission(resource, action, possession)
    return permission?.attributes || ['*']
  }

  function filterByAttributes<T extends Record<string, any>>(
    data: T,
    resource: string,
    action: string,
    possession?: AccessControlPossession | string,
  ): Partial<T> {
    const permission = getPermission(resource, action, possession)

    return permission?.filter(data)
  }

  function hasPermissionStartsWith(
    patterns: string |string[],
  ): boolean {
    if (roles.includes(AC_ADMIN_ROLE)) {
      return true
    }

    const effectiveRoles = resolveEffectiveRoles(roles)

    // Cas "menu public" : si aucun rôle et aucune ACL chargée, on laisse afficher les tuiles non restreintes.
    if (!effectiveRoles.length && (!access || Object.keys(access).length === 0)) {
      return true
    }

    for (const role of effectiveRoles) {
      const actions = access[role] as AccessObjectAction || {}
      for (const action of Object.keys(actions)) {
        const normalizedKey = action.replace(/^\//, '')
        if (Array.isArray(patterns) ? patterns.some((pattern) => normalizedKey.startsWith(pattern)) : normalizedKey.startsWith(patterns)) {
          return true
        }
      }
    }

    return false
  }

  return {
    getPermission,
    hasPermission,
    getAttributes,
    filterByAttributes,
    hasPermissionStartsWith,

    accessControl,
  }
}
