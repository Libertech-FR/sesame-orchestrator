import { DynamicModule, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import {PasswdadmModule} from "~/settings/passwdadm/passwdadm.module";
import {SettingsController} from "~/settings/settings.controller";
import {SettingsService} from "~/settings/settings.service";
import {SmsadmService} from "~/settings/smsadm.service";
import {MongooseModule} from "@nestjs/mongoose";
import {Settings, SettingsSchema} from "~/settings/_schemas/settings.schema";
import {SmsadmController} from "~/settings/smsadm.controller";
@Module({
  exports: [
    SmsadmService
  ],
  imports: [ PasswdadmModule,
    MongooseModule.forFeatureAsync([
    {
      name: Settings.name,
      useFactory: () => SettingsSchema,
    }
  ])],
  providers: [SettingsService,SmsadmService],
  controllers: [SettingsController,SmsadmController],
})
export class SettingsModule {
  public static register(): DynamicModule {
    return {
      module: this,
      imports: [
        RouterModule.register([
          {
            path: 'settings',
            children: [...Reflect.getMetadata('imports', this)],
          },
        ]),
      ],
    };
  }
}
