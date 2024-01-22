import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdentitiesSchema, Identities } from './_schemas/identities.schema';
import { IdentitiesService } from './identities.service';
import { IdentitiesController } from './identities.controller';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { IdentityState } from './_enums/states.enum';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Identities.name,
        imports: [IdentitiesValidationModule],
        inject: [IdentitiesValidationService],
        useFactory: (validationService: IdentitiesValidationService) => {
          const schema = IdentitiesSchema;
          // Pre validation hook
          // This hook is used to validate the additionalFields
          // If the validation fails and the state is TO_CREATE, the state is set to TO_COMPLETE
          // Else the error is thrown
          schema.pre('validate', async function (next) {
            try {
              Logger.log(`additionalFields validation start for ${this.inetOrgPerson.cn}  `);
              await validationService.validate(this.additionalFields);
              Logger.log(`additionalFields validation end for ${this.inetOrgPerson.cn}  `);
            } catch (error) {
              Logger.error(`additionalFields validation error for ${this.inetOrgPerson.cn}  `, error);
              if (this.state === IdentityState.TO_CREATE) this.state = IdentityState.TO_COMPLETE;
              else throw error;
            }
            next();
          });

          // Pre save hook
          // This hook is used to set the state to TO_SYNC if the state is TO_CREATE
          schema.pre('save', async function (next) {
            console.log('pre save');
            if (this.state === IdentityState.TO_CREATE) this.state = IdentityState.TO_SYNC;
            next();
          });

          return schema;
        },
        //TODO: Si le schema est save, pousser dans la queue de sync
      },
    ]),
  ],
  providers: [IdentitiesService, IdentitiesValidationService],
  controllers: [IdentitiesController],
})
export class IdentitiesModule {}
