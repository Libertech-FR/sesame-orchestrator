import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, SaveOptions, Document, Types, UpdateQuery, QueryOptions, ModifyResult, Query } from 'mongoose'
import { DiscoveryService, MetadataScanner } from '@nestjs/core'
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema'
import { Roles } from './_schemas/roles.schema'
import { RolesBuilder } from 'nest-access-control'
import { IAccessInfo } from 'accesscontrol'
import { AC_ADMIN_ROLE, AC_GUEST_ROLE } from '~/_common/types/ac-types'
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

  public async e<T extends AbstractSchema | Document>(data?: any, options?: SaveOptions): Promise<Document<T, any, T>> {
    if (data.name === AC_ADMIN_ROLE || data.name === AC_GUEST_ROLE) {
      throw new Error('You cannot modify the default roles')
    }

    if (!data.displayName) {
      data.displayName = data.name.charAt(0).toUpperCase() + data.name.slice(1)
    }

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

    return super.update(_id, update, options)
  }

  public async getRolesBuilder(): Promise<RolesBuilder> {
    const inherits = new Map<string, string[]>()
    const grants: IAccessInfo[] = []

    for (const role of await this._model.find().exec()) {
      if (role.inherits) {
        inherits.set(role.name, role.inherits)
      }

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

    // !!! Si grants défini ici, ils écraseront les rôles par defaut !!!

    for (const [role, inherit] of Object.entries(inherits)) {
      ac.grant(role).inherit(inherit)
    }

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
