import { Module } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { PasswdController } from './passwd.controller';
import { BackendsModule } from '~/core/backends/backends.module';
import { IdentitiesModule } from '../identities/identities.module';
<<<<<<< HEAD
import { SettingsModule } from '~/settings/settings.module';

@Module({
  imports: [BackendsModule, IdentitiesModule, SettingsModule],
  controllers: [PasswdController],
  providers: [PasswdService],
=======
import { PasswdadmModule } from '~/settings/passwdadm/passwdadm.module';
import { PasswdadmService } from '~/settings/passwdadm/passwdadm.service';
import { SmsService } from '~/management/passwd/sms-service';

@Module({
  imports: [BackendsModule, IdentitiesModule, PasswdadmModule],
  controllers: [PasswdController],
  providers: [PasswdService, SmsService],
>>>>>>> 0cb4493 (chore: Update filestorage configuration for identities module)
})
export class PasswdModule {}
