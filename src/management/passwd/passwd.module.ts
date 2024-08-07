import { Module } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { PasswdController } from './passwd.controller';
import { BackendsModule } from '~/core/backends/backends.module';
import { IdentitiesModule } from '../identities/identities.module';
import { PasswdadmModule} from "~/settings/passwdadm/passwdadm.module";
import {PasswdadmService} from "~/settings/passwdadm/passwdadm.service";
import {SmsService} from "~/management/passwd/sms-service";


@Module({
  imports: [BackendsModule,
    IdentitiesModule, PasswdadmModule ],
  controllers: [PasswdController],
  providers: [PasswdService,SmsService],
})
export class PasswdModule { }
