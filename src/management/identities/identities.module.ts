import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdentitiesSchema, Identities } from './_schemas/identities.schema';
import { IdentitiesService } from './identities.service';
import { IdentitiesController } from './identities.controller';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { IdentitiesValidationModule } from './validations/identities.validation.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Identities.name,
        imports: [IdentitiesValidationModule],
        inject: [IdentitiesValidationService],
        useFactory: (validationService: IdentitiesValidationService) => {
          const schema = IdentitiesSchema;
          schema.pre('validate', async function (next) {
            Logger.log('additionalFields validation start');
            await validationService.validate(this.additionalFields);
            Logger.log('additionalFields validation done');
            next();
          });
          return schema;
        },
      },
    ]),
  ],
  providers: [IdentitiesService, IdentitiesValidationService],
  controllers: [IdentitiesController],
})
export class IdentitiesModule {}
