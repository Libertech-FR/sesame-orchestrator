import { Module } from '@nestjs/common';
import { CycleDeVieService } from './cycle-de-vie.service';
//import { PasswdController } from './passwd.controller';
import { IdentitiesModule } from '../identities/identities.module';
import { SettingsModule } from '~/settings/settings.module';
import {CycleDeVie, CycleDeVieSchema} from "~/management/cyclevie/_schemas/cycle-de-vie.schema";
import {MongooseModule} from "@nestjs/mongoose";


@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: CycleDeVie.name,
        useFactory: () => CycleDeVieSchema,
      },
    ]),
  ],
  //controllers: [PasswdController],
  providers: [CycleDeVieService],
})
export class CycleDeVieModule {}
