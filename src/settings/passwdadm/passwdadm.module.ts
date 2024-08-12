import { Module } from '@nestjs/common';
import { PasswdadmService } from './passwdadm.service';
import { PasswdadmController } from './passwdadm.controller';
import { BackendsModule } from '~/core/backends/backends.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Settings, SettingsSchema } from '~/settings/_schemas/settings.schema';
@Module({
  imports: [
    BackendsModule,
    MongooseModule.forFeatureAsync([
      {
        name: Settings.name,
        useFactory: () => SettingsSchema,
      },
    ]),
  ],
  controllers: [PasswdadmController],
  providers: [PasswdadmService],
  exports: [PasswdadmService],
})
export class PasswdadmModule {}
