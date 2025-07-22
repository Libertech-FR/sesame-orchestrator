import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lifecycle, LifecycleSchema } from './_schemas/lifecycle.schema';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleService } from './lifecycle.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Lifecycle.name,
        schema: LifecycleSchema,
      },
    ]),
  ],
  providers: [LifecycleService],
  controllers: [LifecycleController],
  exports: [LifecycleService],
})
export class LifecycleModule { }
