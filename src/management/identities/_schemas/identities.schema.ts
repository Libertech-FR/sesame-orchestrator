import { inetOrgPerson, inetOrgPersonSchema } from './_parts/inetOrgPerson.part';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { IdentitiessState } from '../_enums/states.enum';
import { AdditionalFieldsPart, AdditionalFieldsPartSchema } from './_parts/additionalFields.part.schema';

export type IdentitiesDocument = Identities & Document;

@Schema({ versionKey: false })
export class Identities extends AbstractSchema {
  @Prop({ type: Number, enum: IdentitiessState, default: IdentitiessState.UNKNOWN })
  state: IdentitiessState;

  @Prop({ type: inetOrgPersonSchema, required: true })
  inetOrgPerson: inetOrgPerson;

  @Prop({ type: AdditionalFieldsPartSchema, required: false, default: {} })
  additionalFields: AdditionalFieldsPart;
}

export const IdentitiesSchema = SchemaFactory.createForClass(Identities);
