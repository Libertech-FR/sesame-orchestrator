import { Module } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import { MongooseModule } from '@nestjs/mongoose'
import { Roles, RolesSchema } from './_schemas/roles.schema'
import { RolesService } from './roles.service'
import { RolesController } from './roles.controller'
import { AclRuntimeService } from './acl-runtime.service'

@Module({
  imports: [
    DiscoveryModule,
    MongooseModule.forFeatureAsync([
      {
        name: Roles.name,
        useFactory: () => RolesSchema,
      },
    ]),
  ],
  providers: [RolesService, AclRuntimeService],
  controllers: [RolesController],
  exports: [RolesService, AclRuntimeService],
})
export class RolesModule { }
