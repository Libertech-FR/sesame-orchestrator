import { DynamicModule, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import {PasswdadmModule} from "~/settings/passwdadm/passwdadm.module";
import {SettingsController} from "~/settings/settings.controller";
import {SettingsService} from "~/settings/settings.service";
import {SmsadmService} from "~/settings/smsadm.service";
@Module({
  imports: [ PasswdadmModule],
  providers: [SettingsService,SmsadmService],
  controllers: [SettingsController],
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
