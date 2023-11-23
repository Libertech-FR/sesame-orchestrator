import { Injectable } from '@nestjs/common';
import {ChangePasswordDto} from "./dto/change-password.dto";
import {InjectQueue} from "@nestjs/bullmq";
import { Queue,QueueEvents} from 'bullmq'
import { ConfigService } from '@nestjs/config';
@Injectable()
export class PasswdService {

  constructor(private readonly configService:ConfigService){}
  async change(passwd:ChangePasswordDto) {
     const redisConfig={host:this.configService.get('redis.host'),port:this.configService.get('redis.port')}
      const queue=new Queue(this.configService.get('nameQueue'),{connection:redisConfig})
      const queueEvents = new QueueEvents(this.configService.get('nameQueue'),{connection: redisConfig})
        const job=await queue.add('CHANGEPWD',passwd)
      queueEvents.on('failed',(errors)=>{
          console.log(errors)
      })
        return await job.waitUntilFinished(queueEvents,30000)
  }
}





