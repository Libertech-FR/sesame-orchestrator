import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditsSchema, Audits } from '~/core/audits/_schemas/audits.schema';
import { AuditsService } from './audits.service';
import { AuditsController } from './audits.controller';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Audits.name,
        useFactory: () => AuditsSchema,
      },
    ]),
  ],
  providers: [AuditsService],
  controllers: [AuditsController],
  exports: [AuditsService],
})
export class AuditsModule { }
