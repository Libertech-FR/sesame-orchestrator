import { IdentityLifecycle } from './../_enums/lifecycle.enum';
import { inetOrgPerson, inetOrgPersonSchema } from './_parts/inetOrgPerson.part';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { IdentityState } from '../_enums/states.enum';
import { AdditionalFieldsPart, AdditionalFieldsPartSchema } from './_parts/additionalFields.part.schema';

export type IdentitiesDocument = Identities & Document;

@Schema({ versionKey: false })
export class Identities extends AbstractSchema {
  @Prop({ type: Number, enum: IdentityState, default: IdentityState.UNKNOWN })
  state: IdentityState;

  @Prop({ type: Number, enum: IdentityLifecycle, default: IdentityLifecycle.INACTIVE })
  lifecycle: IdentityLifecycle;

  @Prop({ type: inetOrgPersonSchema, required: true })
  inetOrgPerson: inetOrgPerson;

  @Prop({ type: AdditionalFieldsPartSchema, required: false, default: {} })
  additionalFields: AdditionalFieldsPart;
}

export const IdentitiesSchema = SchemaFactory.createForClass(Identities);
