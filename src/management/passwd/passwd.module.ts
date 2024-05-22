import { Module } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { PasswdController } from './passwd.controller';
import { BackendsModule } from '~/core/backends/backends.module';
import { IdentitiesModule } from '../identities/identities.module';

@Module({
  imports: [BackendsModule, IdentitiesModule],
  controllers: [PasswdController],
  providers: [PasswdService],
})
export class PasswdModule { }
