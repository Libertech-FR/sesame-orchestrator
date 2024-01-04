import { Module } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { PasswdController } from './passwd.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [PasswdController],
  providers: [PasswdService],
})
export class PasswdModule {}
