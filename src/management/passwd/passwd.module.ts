import { Module } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { PasswdController } from './passwd.controller';
import { BackendsModule } from '~/core/backends/backends.module';
import { IdentitiesModule } from '../identities/identities.module';
import { PasswdadmModule} from "~/settings/passwdadm/passwdadm.module";
import {PasswdadmService} from "~/settings/passwdadm/passwdadm.service";


@Module({
  imports: [BackendsModule,
    IdentitiesModule, PasswdadmModule],
  controllers: [PasswdController],
  providers: [PasswdService],
})
export class PasswdModule { }
