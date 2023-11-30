import { Injectable } from '@nestjs/common';
import Redis from "ioredis";
import crypto from "crypto";
import {ConfigService} from "@nestjs/config";
import {Queue, QueueEvents} from "bullmq";

@Injectable()
export class BackendsService {

    constructor(private readonly configService:ConfigService) {}
    async list() {
        const redisConfig={host:this.configService.get('redis.host'),port:this.configService.get('redis.port')}
        const queue=new Queue(this.configService.get('nameQueue'),{connection:redisConfig})
        const queueEvents = new QueueEvents(this.configService.get('nameQueue'),{connection: redisConfig})
        const job=await queue.add('LISTBACKEND',"x")
        queueEvents.on('failed',(errors)=>{
            console.log(errors)
        })
        return await job.waitUntilFinished(queueEvents,30000)
    }
    async alive() {
        const redisConfig={host:this.configService.get('redis.host'),port:this.configService.get('redis.port')}
        const queue=new Queue(this.configService.get('nameQueue'),{connection:redisConfig})
        const queueEvents = new QueueEvents(this.configService.get('nameQueue'),{connection: redisConfig})
        const job=await queue.add('PING',"x")
        queueEvents.on('failed',(errors)=>{
            console.log(errors)
        })
        return await job.waitUntilFinished(queueEvents,30000)
    }




}
