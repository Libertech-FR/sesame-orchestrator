import { Injectable } from '@nestjs/common';
import {ChangePasswordDto} from "./dto/change-password.dto";
import {InjectQueue} from "@nestjs/bullmq";
import {Job, Queue,QueueEvents} from 'bullmq'
@Injectable()
export class PasswdService {
    constructor(@InjectQueue('backend') private backendQueue: Queue){}

  async change(passwd:ChangePasswordDto) {
      const queueEvents = new QueueEvents('backend',{connection: {host:'redis',port:6379}})
        const job=await this.backendQueue.add('CHANGEPWD',passwd)
      queueEvents.on('failed',(errors)=>{
          console.log(errors)
      })
        return await job.waitUntilFinished(queueEvents)


  }
}





