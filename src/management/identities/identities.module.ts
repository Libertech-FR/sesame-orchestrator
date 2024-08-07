import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { IdentitiesService } from './identities.service';
import { IdentitiesController } from './identities.controller';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { IdentitiesJsonformsService } from './jsonforms/identities.jsonforms.service';
import { IdentitiesJsonformsModule } from './jsonforms/identities.jsonforms.module';
import { APP_FILTER } from '@nestjs/core';
import { IdentitiesValidationFilter } from '~/_common/filters/identities-validation.filter';
import { FilestorageModule } from '~/core/filestorage/filestorage.module';

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
  ],
  providers: [
    IdentitiesService,
    IdentitiesValidationService,
    {
      provide: APP_FILTER,
      useClass: IdentitiesValidationFilter,
    },
    IdentitiesJsonformsService,
  ],
  controllers: [IdentitiesController],
  exports: [IdentitiesService],
})
export class IdentitiesModule { }
