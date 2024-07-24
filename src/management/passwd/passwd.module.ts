import { Module } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { PasswdController } from './passwd.controller';
import { BackendsModule } from '~/core/backends/backends.module';
import { IdentitiesModule } from '../identities/identities.module';
import {MongooseModule} from "@nestjs/mongoose";
import {Agents, AgentsSchema} from "~/core/agents/_schemas/agents.schema";
import {PasswordPolicies,PasswordPoliciesSchema} from "~/management/passwd/_schemas/PasswordPolicies";

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
  controllers: [PasswdController],
  providers: [PasswdService],
})
export class PasswdModule { }
