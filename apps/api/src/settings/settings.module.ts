import { DynamicModule, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
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
import { ConfigurationService } from '~/settings/configuration.service';
import { ConfigurationController } from '~/settings/configuration.controller';
import { IdentitiesDefaultsService } from '~/settings/identities-defaults.service';
import { IdentitiesDefaultsController } from '~/settings/identities-defaults.controller';

@Module({
  exports: [SmsadmService, PasswdadmService, MailadmService, ConfigurationService, IdentitiesDefaultsService],
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Settings.name,
        useFactory: () => SettingsSchema,
      },
    ]),
  ],
  providers: [
    SettingsService,
    SmsadmService,
    PasswdadmService,
    MailadmService,
    ConfigurationService,
    IdentitiesDefaultsService,
  ],
  controllers: [
    SettingsController,
    SmsadmController,
    PasswdadmController,
    MailadmController,
    ConfigurationController,
    IdentitiesDefaultsController,
  ],
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
