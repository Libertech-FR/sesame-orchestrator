import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackendsModule } from '~/core/backends/backends.module';
import { IdentitiesModule } from '~/management/identities/identities.module';
import { Groups, GroupsSchema } from './_schemas/groups.schema';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Groups.name,
        useFactory: () => GroupsSchema,
      },
    ]),
    IdentitiesModule,
    forwardRef(() => BackendsModule),
  ],
  providers: [GroupsService],
  controllers: [GroupsController],
  exports: [GroupsService],
})
export class GroupsModule {}
