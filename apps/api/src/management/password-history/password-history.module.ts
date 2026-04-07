import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { SettingsModule } from '~/settings/settings.module'
import { PasswordHistory, PasswordHistorySchema } from './_schemas/password-history.schema'
import { PasswordHistoryService } from './password-history.service'
import { PasswordHistoryController } from './password-history.controller'

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: PasswordHistory.name,
        useFactory: () => PasswordHistorySchema,
      },
    ]),
    SettingsModule,
  ],
  controllers: [PasswordHistoryController],
  providers: [PasswordHistoryService],
  exports: [PasswordHistoryService],
})
export class PasswordHistoryModule {}

