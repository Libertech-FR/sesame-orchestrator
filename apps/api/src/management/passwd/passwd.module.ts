import { Module } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { PasswdController } from './passwd.controller';
import { BackendsModule } from '~/core/backends/backends.module';
import { IdentitiesModule } from '../identities/identities.module';
import { SettingsModule } from '~/settings/settings.module';
import { PasswordHistoryModule } from '~/management/password-history/password-history.module';

@Module({
  imports: [BackendsModule, IdentitiesModule, SettingsModule, PasswordHistoryModule],
  controllers: [PasswdController],
  providers: [PasswdService],
})
export class PasswdModule {}
