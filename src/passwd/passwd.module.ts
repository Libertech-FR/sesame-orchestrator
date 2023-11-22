import { Module } from '@nestjs/common';
import { PasswdService } from './passwd.service';
import { PasswdController } from './passwd.controller';
import {BullModule} from "@nestjs/bullmq";

@Module({
  imports: [PasswdModule,
    BullModule.registerQueue(
        {
          name: 'backend',
          connection: {host:'redis',port:6379}}
    )
  ],
  controllers: [PasswdController],
  providers: [PasswdService],
})
export class PasswdModule {}
