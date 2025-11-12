import { forwardRef, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { IdentitiesActivationController } from '~/management/identities/identities-activation.controller';
import { IdentitiesActivationService } from '~/management/identities/identities-activation.service';
import { IdentitiesDoublonController } from '~/management/identities/identities-doublon.controller';
import { IdentitiesForcePasswordController } from "~/management/identities/identities-forcepassword.controller";
import { IdentitiesForcepasswordService } from "~/management/identities/identities-forcepassword.service";
import { SettingsModule } from "~/settings/settings.module";
import { EnsureIdentitiesIndexMiddleware } from './_middlewares/ensure-identities-index.middleware';
import { AgentsModule } from '~/core/agents/agents.module';
import { useOnCli } from '~/_common/functions/is-cli';
import { IdentitiesCommand } from '~/management/identities/identities.command';


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
    SettingsModule,
    AgentsModule,
  ],
  providers: [
    IdentitiesUpsertService,
    IdentitiesCrudService,
    IdentitiesDoublonService,
    IdentitiesValidationService,
    IdentitiesActivationService,
    {
      provide: APP_FILTER,
      useClass: IdentitiesValidationFilter,
    },
    IdentitiesJsonformsService,
    IdentitiesForcepasswordService,
    ...useOnCli(IdentitiesCommand.registerWithSubCommands()),
  ],
  controllers: [
    IdentitiesCrudController,
    IdentitiesUpsertController,
    IdentitiesPhotoController,
    IdentitiesDoublonController,
    IdentitiesActivationController,
    IdentitiesForcePasswordController
  ],
  exports: [IdentitiesCrudService, IdentitiesUpsertService],
})
export class IdentitiesModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer.apply(EnsureIdentitiesIndexMiddleware).forRoutes('/management/identities/*');
  }
}
