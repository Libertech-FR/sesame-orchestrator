import { Module } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { PasswdController } from './passwd.controller';

@Module({
  imports: [PasswdModule],
  controllers: [PasswdController],
  providers: [PasswdService],
})
export class PasswdModule {}
