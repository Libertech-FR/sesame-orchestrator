import { Module } from '@nestjs/common';
import { IdentitiesValidationService } from './identities.validation.service';
import { IdentitiesValidationController } from './identities.validation.controller';

@Module({
  controllers: [IdentitiesValidationController],
  providers: [IdentitiesValidationService],
  exports: [IdentitiesValidationService],
})
export class IdentitiesValidationModule {}
