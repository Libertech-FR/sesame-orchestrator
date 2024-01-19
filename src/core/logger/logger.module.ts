import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerSchema, Logger } from './schemas/logger.schema';
import { LoggerService } from './logger.service';
import { LoggerController } from './logger.controller';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Logger.name,
        useFactory: () => LoggerSchema,
      },
    ]),
  ],
  providers: [LoggerService],
  controllers: [LoggerController],
})
export class LoggerModule {}
