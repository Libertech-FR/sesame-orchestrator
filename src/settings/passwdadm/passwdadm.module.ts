import { Module } from '@nestjs/common';
import { PasswdadmService } from './passwdadm.service';
import { PasswdadmController } from './passwdadm.controller';
import { BackendsModule } from '~/core/backends/backends.module';
import { IdentitiesModule } from '~/management/identities/identities.module';
import {MongooseModule} from "@nestjs/mongoose";
import {PasswordPolicies,PasswordPoliciesSchema} from "~/settings/passwdadm/_schemas/PasswordPolicies";

@Module({
  imports: [BackendsModule,
    IdentitiesModule,
    MongooseModule.forFeatureAsync([
      {
        name: PasswordPolicies.name,
        useFactory: () => PasswordPoliciesSchema,
      },
    ]),
  ],
  controllers: [PasswdadmController],
  providers: [PasswdadmService],
  exports:[
    PasswdadmService
  ]
})
export class PasswdadmModule { }
