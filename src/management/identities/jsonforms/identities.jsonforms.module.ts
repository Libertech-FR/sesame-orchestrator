import { Module } from '@nestjs/common';
import { IdentitiesJsonformsService } from './identities.jsonforms.service';
import { IdentitiesJsonFormsController } from './identities.jsonforms.controller';

@Module({
  controllers: [IdentitiesJsonFormsController],
  providers: [IdentitiesJsonformsService],
  exports: [IdentitiesJsonformsService],
})
export class IdentitiesJsonformsModule {}
