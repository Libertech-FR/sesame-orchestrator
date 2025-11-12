import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KeyringsSchema, Keyrings } from '~/core/keyrings/_schemas/keyrings.schema';
import { KeyringsService } from './keyrings.service';
import { KeyringsController } from './keyrings.controller';
import { KeyringsCommand, KeyringsCreateQuestions } from '~/core/keyrings/keyrings.command';
import { AuthModule } from '~/core/auth/auth.module';
import { useOnCli } from '~/_common/functions/is-cli';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Keyrings.name,
        useFactory: () => KeyringsSchema,
      },
    ]),
    forwardRef(() => AuthModule),
  ],
  providers: [
    KeyringsService,
    ...useOnCli([
      ...KeyringsCommand.registerWithSubCommands(),
      KeyringsCreateQuestions,
    ]),
  ],
  controllers: [KeyringsController],
  exports: [KeyringsService],
})
export class KeyringsModule { }
