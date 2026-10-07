import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackendsModule } from '~/core/backends/backends.module';
import { IdentitiesModule } from '~/management/identities/identities.module';
import { GroupFamilies, GroupFamiliesSchema } from './_schemas/group-families.schema';
import { Groups, GroupsSchema } from './_schemas/groups.schema';
import { GroupFamiliesController } from './group-families.controller';
import { GroupFamiliesService } from './group-families.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Groups.name,
        useFactory: () => GroupsSchema,
      },
      {
        name: GroupFamilies.name,
        useFactory: () => GroupFamiliesSchema,
      },
    ]),
    IdentitiesModule,
    forwardRef(() => BackendsModule),
  ],
  providers: [GroupsService, GroupFamiliesService],
  controllers: [GroupsController, GroupFamiliesController],
  exports: [GroupsService, GroupFamiliesService],
})
export class GroupsModule {}
