import { HttpException, Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdentitiesSchema, Identities } from './_schemas/identities.schema';
import { IdentitiesService } from './identities.service';
import { IdentitiesController } from './identities.controller';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { IdentityState } from './_enums/states.enum';
import { ValidationConfigException, ValidationSchemaException } from '~/_common/errors/ValidationException';

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
            const logPrefix = `Validation [${this.inetOrgPerson.cn}]:`;
            try {
              Logger.log(`${logPrefix} Starting additionalFields validation.`);
              await validationService.validate(this.additionalFields);
              Logger.log(`${logPrefix} AdditionalFields validation successful.`);
            } catch (error) {
              handleValidationError(error, this, logPrefix);
            }
            next();
          });

          schema.pre('save', async function (next) {
            if (this.state === IdentityState.TO_CREATE) {
              this.state = IdentityState.TO_VALIDATE;
            }
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

function handleValidationError(error: Error | HttpException, identity: Identities, logPrefix: string) {
  if (error instanceof ValidationConfigException) {
    Logger.error(`${logPrefix} Validation config error. ${JSON.stringify(error.getValidations())}`);
    throw new ValidationConfigException(error.getPayload());
  }

  if (error instanceof ValidationSchemaException) {
    Logger.warn(`${logPrefix} Validation schema error. ${JSON.stringify(error.getValidations())}`);
    if (identity.state === IdentityState.TO_CREATE) {
      Logger.warn(`${logPrefix} State set to TO_COMPLETE.`);
      identity.state = IdentityState.TO_COMPLETE;
      identity.additionalFields.validations = error.getValidations();
    } else {
      Logger.error(`${logPrefix} Validation schema error. ${JSON.stringify(error.getValidations())}`);
      throw new ValidationSchemaException(error.getPayload());
    }
  } else {
    Logger.error(`${logPrefix} Unhandled error: ${error.message}`);
    throw error; // Rethrow the original error if it's not one of the handled types.
  }
}
