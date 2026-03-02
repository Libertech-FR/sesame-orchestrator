import { Injectable, Logger } from '@nestjs/common'
import { RolesBuilder } from 'nest-access-control'
import { RolesService } from './roles.service'

@Injectable()
export class AclRuntimeService {
  private readonly logger = new Logger(AclRuntimeService.name)
  private rolesBuilder: RolesBuilder | null = null
  private refreshPromise: Promise<RolesBuilder> | null = null
  private readonly guardRolesBuilder: RolesBuilder

  public constructor(
    private readonly rolesService: RolesService,
  ) {
    this.guardRolesBuilder = new Proxy({} as RolesBuilder, {
      get: (_target, property, _receiver) => {
        if (!this.rolesBuilder) {
          throw new Error('ACL roles builder is not initialized yet')
        }

        const value = Reflect.get(this.rolesBuilder as unknown as object, property)
        return typeof value === 'function' ? value.bind(this.rolesBuilder) : value
      },
    })
  }

  public async getGuardRolesBuilder(): Promise<RolesBuilder> {
    await this.getRolesBuilder()
    return this.guardRolesBuilder
  }

  public async getRolesBuilder(): Promise<RolesBuilder> {
    if (this.rolesBuilder) {
      return this.rolesBuilder
    }

    return this.refresh()
  }

  public async refresh(): Promise<RolesBuilder> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.rolesService.getRolesBuilder()
      .then((rolesBuilder) => {
        this.rolesBuilder = rolesBuilder
        this.logger.log('ACL reloaded from roles collection')
        return rolesBuilder
      })
      .finally(() => {
        this.refreshPromise = null
      })

    return this.refreshPromise
  }
}
