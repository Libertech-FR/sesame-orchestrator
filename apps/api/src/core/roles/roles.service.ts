import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, SaveOptions, Document, Types, UpdateQuery, QueryOptions, ModifyResult, Query } from 'mongoose'
import { DiscoveryService, MetadataScanner } from '@nestjs/core'
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema'
import { Roles } from './_schemas/roles.schema'
import { RolesBuilder } from 'nest-access-control'
import { IAccessInfo } from 'accesscontrol'
import { AC_ACTIONS, AC_ADMIN_ROLE, AC_GUEST_ROLE, AC_INTERNAL_DEFAULT_ROLES, AC_INTERNAL_DEFAULT_ROLES_GRANTS, AC_INTERNAL_ROLE_PREFIX } from '~/_common/types/ac-types'
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema'
import { META_AC_RULE, type AcRule } from '~/_common/decorators/use-roles.decorator'

@Injectable()
export class RolesService extends AbstractServiceSchema<Roles> {
  public constructor(
    @InjectModel(Roles.name) protected _model: Model<Roles>,
    private readonly _discoveryService: DiscoveryService,
    private readonly _metadataScanner: MetadataScanner,
  ) {
    super()
  }

  private normalizeInherits(inherits: unknown): string[] {
    if (!Array.isArray(inherits)) return []
    const cleaned = inherits
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0)

    const unique = [...new Set(cleaned)]

    // Tous les rôles custom héritent au minimum de guest
    if (!unique.includes(AC_GUEST_ROLE)) {
      unique.push(AC_GUEST_ROLE)
    }

    return unique
  }

  private async validateInherits(roleName: string, inherits: string[]): Promise<void> {
    const name = `${roleName ?? ''}`.trim().toLowerCase()
    const parents = this.normalizeInherits(inherits)

    if (name.length === 0) {
      throw new Error('Role name is required to validate inheritance')
    }

    if (parents.includes(name)) {
      throw new Error('A role cannot inherit from itself')
    }

    if (parents.includes(AC_ADMIN_ROLE)) {
      throw new Error('A role cannot inherit from administrator')
    }

    // Allowed role names include defaults (not stored in DB)
    const dbRoles = await this._model.find({}, { name: 1, inherits: 1 }).lean()
    const allowed = new Set<string>([
      AC_ADMIN_ROLE,
      AC_GUEST_ROLE,
      ...AC_INTERNAL_DEFAULT_ROLES.map((r) => r.name),
    ])
    for (const r of dbRoles) {
      if (typeof (r as any)?.name === 'string') {
        allowed.add(String((r as any).name).trim().toLowerCase())
      }
    }

    for (const p of parents) {
      if (!allowed.has(p)) {
        throw new Error(`Inherited role "${p}" does not exist`)
      }
    }

    // Cycle detection: follow inherits links in DB graph + defaults (defaults have no parents)
    const graph = new Map<string, string[]>()
    graph.set(AC_ADMIN_ROLE, [])
    graph.set(AC_GUEST_ROLE, [])
    for (const r of AC_INTERNAL_DEFAULT_ROLES) {
      graph.set(r.name, this.normalizeInherits(r.inherits))
    }
    for (const r of dbRoles) {
      const rName = String((r as any).name ?? '').trim().toLowerCase()
      if (rName.length === 0) continue
      graph.set(rName, this.normalizeInherits((r as any).inherits))
    }
    graph.set(name, parents) // include pending change

    const visiting = new Set<string>()
    const visited = new Set<string>()

    const dfs = (n: string): void => {
      if (visited.has(n)) return
      if (visiting.has(n)) {
        throw new Error(`Role inheritance cycle detected at "${n}"`)
      }
      visiting.add(n)
      const next = graph.get(n) ?? []
      for (const m of next) {
        dfs(m)
      }
      visiting.delete(n)
      visited.add(n)
    }

    dfs(name)
  }

  public async e<T extends AbstractSchema | Document>(data?: any, options?: SaveOptions): Promise<Document<T, any, T>> {
    if (data.name === AC_ADMIN_ROLE || data.name === AC_GUEST_ROLE) {
      throw new Error('You cannot modify the default roles')
    }

    if (typeof data?.name === 'string' && data.name.trim().toLowerCase().startsWith(AC_INTERNAL_ROLE_PREFIX)) {
      throw new Error(`You cannot create roles starting with "${AC_INTERNAL_ROLE_PREFIX}"`)
    }

    if (!data.displayName) {
      data.displayName = data.name.charAt(0).toUpperCase() + data.name.slice(1)
    }

    if (data?.inherits === undefined || data?.inherits === null) {
      data.inherits = [AC_GUEST_ROLE]
    } else {
      data.inherits = this.normalizeInherits(data.inherits)
    }
    await this.validateInherits(data.name, data.inherits)

    return super.create(data, options)
  }

  public async update<T extends AbstractSchema | Document>(
    _id: Types.ObjectId | any,
    update: UpdateQuery<T>,
    options?: QueryOptions<T>,
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    if (update.name === AC_ADMIN_ROLE || update.name === AC_GUEST_ROLE) {
      throw new Error('You cannot modify the default roles')
    }

    const existing = await this._model.findById(_id, { name: 1, inherits: 1 }).lean()
    const nextName = typeof (update as any)?.name === 'string'
      ? String((update as any).name)
      : String((existing as any)?.name ?? '')

    if (nextName.trim().toLowerCase().startsWith(AC_INTERNAL_ROLE_PREFIX)) {
      throw new Error(`You cannot modify roles starting with "${AC_INTERNAL_ROLE_PREFIX}"`)
    }

    if ((update as any)?.inherits !== undefined) {
      const normalized = this.normalizeInherits((update as any).inherits)
      ;(update as any).inherits = normalized
      await this.validateInherits(nextName, normalized)
    } else if (typeof (update as any)?.name === 'string') {
      // Si on renomme un rôle, il faut revalider l'héritage existant (pour éviter l'auto-héritage après renommage)
      const currentInherits = this.normalizeInherits((existing as any)?.inherits)
      await this.validateInherits(nextName, currentInherits)
    }

    return super.update(_id, update, options)
  }

  public async getRolesBuilder(): Promise<RolesBuilder> {
    const inherits = new Map<string, string[]>()
    const grants: IAccessInfo[] = []

    for (const role of await this._model.find().exec()) {
      // Tous les rôles custom héritent au minimum de guest (même si des anciens documents ne l'ont pas stocké)
      const normalizedInherits = this.normalizeInherits(role.inherits)
      // console.log('role', role.name, role.inherits, normalizedInherits)
      inherits.set(role.name, normalizedInherits)

      for (const access of role.access) {
        for (const action of access.action) {
          grants.push({
            role: role.name,
            action,
            resource: access.resource,
          })
        }
      }
    }

    const ac = new RolesBuilder(grants)

    // Definit en dur les rôles par defaut.
    // !!! ne doit pas y avoir de role portant le même nom en base de données !!!

    // Definir droits par defaut pour les rôles par defaut ICI
    ac.grant(AC_ADMIN_ROLE)
    ac.grant(AC_GUEST_ROLE)

    for (const internalRole of AC_INTERNAL_DEFAULT_ROLES) {
      ac.grant(internalRole.name).inherit(this.normalizeInherits(internalRole.inherits))
    }

    for (const grant of AC_INTERNAL_DEFAULT_ROLES_GRANTS) {
      switch (grant.action) {
        case AC_ACTIONS.CREATE:
          ac.grant(grant.role).createAny(grant.resource)
          break
        case AC_ACTIONS.READ:
          ac.grant(grant.role).readAny(grant.resource)
          break
        case AC_ACTIONS.UPDATE:
          ac.grant(grant.role).updateAny(grant.resource)
          break
        case AC_ACTIONS.DELETE:
          ac.grant(grant.role).deleteAny(grant.resource)
          break
      }
    }

    for (const [role, inherit] of inherits.entries()) {
      ac.grant(role).inherit(inherit)
    }

    // !!! Si grants défini ici, ils écraseront les rôles par defaut !!!

    return ac.lock()
  }

  private getResourcesFromDecorators(): string[] {
    const resources = new Set<string>()
    const wrappers = [
      ...this._discoveryService.getControllers(),
      ...this._discoveryService.getProviders(),
    ]

    for (const wrapper of wrappers) {
      const instance = wrapper.instance
      if (!instance) continue

      const classRule = Reflect.getMetadata(META_AC_RULE, instance.constructor) as AcRule | undefined
      if (typeof classRule?.resource === 'string' && classRule.resource.trim().length > 0) {
        resources.add(classRule.resource.trim())
      }

      const prototype = Object.getPrototypeOf(instance)
      if (!prototype) continue

      const methodNames = this._metadataScanner.getAllMethodNames(prototype)
      for (const methodName of methodNames) {
        const methodRef = prototype[methodName]
        if (typeof methodRef !== 'function') continue

        const methodRule = Reflect.getMetadata(META_AC_RULE, methodRef) as AcRule | undefined
        if (typeof methodRule?.resource === 'string' && methodRule.resource.trim().length > 0) {
          resources.add(methodRule.resource.trim())
        }
      }
    }

    return [...resources]
  }

  public async getResources(): Promise<Array<{ resource: string }>> {
    const roles = await this._model.find({}, { access: 1 }).lean()
    const resources = new Set<string>()

    for (const role of roles) {
      for (const access of role?.access || []) {
        if (typeof access?.resource === 'string' && access.resource.trim().length > 0) {
          resources.add(access.resource.trim())
        }
      }
    }

    for (const resource of this.getResourcesFromDecorators()) {
      if (!resource.startsWith('/')) {
        resources.add(`/${resource}`)
        this.logger.warn(`Resource ${resource} does not start with /, adding /${resource}`)
        continue
      }

      resources.add(resource)
    }

    return [...resources]
      .sort((a, b) => a.localeCompare(b))
      .map((resource) => ({ resource }))
  }
}
