import { Module } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import { MongooseModule } from '@nestjs/mongoose'
import { Roles, RolesSchema } from './_schemas/roles.schema'
import { RolesService } from './roles.service'
import { RolesController } from './roles.controller'

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
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule { }
