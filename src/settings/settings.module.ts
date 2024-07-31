import { DynamicModule, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
<<<<<<< HEAD
import { SettingsController } from '~/settings/settings.controller';
import { SettingsService } from '~/settings/settings.service';
import { SmsadmService } from '~/settings/smsadm.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Settings, SettingsSchema } from '~/settings/_schemas/settings.schema';
import { SmsadmController } from '~/settings/smsadm.controller';
import { PasswdadmService } from '~/settings/passwdadm.service';
import { PasswdadmController } from '~/settings/passwdadm.controller';
import { MailadmService } from '~/settings/mailadm.service';
import { MailadmController } from '~/settings/mailadm.controller';
=======
import {PasswdadmModule} from "~/settings/passwdadm/passwdadm.module";
import {SettingsController} from "~/settings/settings.controller";
import {SettingsService} from "~/settings/settings.service";
>>>>>>> 85a4ce7 (save)
@Module({
  exports: [SmsadmService, PasswdadmService, MailadmService],
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Settings.name,
        useFactory: () => SettingsSchema,
      },
    ]),
  ],
  providers: [SettingsService, SmsadmService, PasswdadmService, MailadmService],
  controllers: [SettingsController, SmsadmController, PasswdadmController, MailadmController],
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
