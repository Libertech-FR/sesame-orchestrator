import { Module } from '@nestjs/common';
import { IdentitiesValidationService } from './identities.validation.service';

@Module({
  providers: [IdentitiesValidationService],
  exports: [IdentitiesValidationService],
})
export class IdentitiesValidationModule {}
