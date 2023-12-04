import { Module } from '@nestjs/common';
import { BackendsService } from './backends.service';
import { BackendsController } from './backends.controller';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [ConfigModule],
  controllers: [BackendsController],
  providers: [BackendsService],
})
export class BackendsModule {}
