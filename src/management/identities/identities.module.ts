import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { IdentitiesJsonformsService } from './jsonforms/identities.jsonforms.service';
import { IdentitiesJsonformsModule } from './jsonforms/identities.jsonforms.module';
import { APP_FILTER } from '@nestjs/core';
import { IdentitiesValidationFilter } from '~/_common/filters/identities-validation.filter';
import { FilestorageModule } from '~/core/filestorage/filestorage.module';
import { BackendsModule } from '~/core/backends/backends.module';
import { IdentitiesUpsertService } from '~/management/identities/identities-upsert.service';
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service';
import { IdentitiesDoublonService } from '~/management/identities/identities-doublon.service';
import { IdentitiesCrudController } from '~/management/identities/identities-crud.controller';
import { IdentitiesUpsertController } from '~/management/identities/identities-upsert.controller';
import { IdentitiesPhotoController } from '~/management/identities/identities-photo.controller';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Identities.name,
        imports: [IdentitiesValidationModule, IdentitiesJsonformsModule],
        inject: [IdentitiesValidationService, IdentitiesJsonformsService],
        useFactory: () => IdentitiesSchema,
      },
    ]),
    FilestorageModule,
    forwardRef(() => BackendsModule),
  ],
  providers: [
    IdentitiesUpsertService,
    IdentitiesCrudService,
    IdentitiesDoublonService,
    IdentitiesValidationService,
    {
      provide: APP_FILTER,
      useClass: IdentitiesValidationFilter,
    },
    IdentitiesJsonformsService,
  ],
  controllers: [IdentitiesCrudController, IdentitiesUpsertController, IdentitiesPhotoController],
  exports: [IdentitiesCrudService],
})
export class IdentitiesModule {}
