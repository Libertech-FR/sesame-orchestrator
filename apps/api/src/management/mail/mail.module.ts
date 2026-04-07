import { Module } from '@nestjs/common'
import { MailTemplatesController } from './mail-templates.controller'
import { MailTemplatesService } from './mail-templates.service'
import { MailSendService } from './mail-send.service'
import { MailSendController } from './mail-send.controller'
import { IdentitiesModule } from '~/management/identities/identities.module'
import { SettingsModule } from '~/settings/settings.module'

@Module({
  imports: [IdentitiesModule, SettingsModule],
  controllers: [MailTemplatesController, MailSendController],
  providers: [MailTemplatesService, MailSendService],
  exports: [MailTemplatesService, MailSendService],
})
export class MailModule {}

