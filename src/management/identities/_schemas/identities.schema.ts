import { IdentityLifecycle } from './../_enums/lifecycle.enum';
import { inetOrgPerson, inetOrgPersonSchema } from './_parts/inetOrgPerson.part';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { IdentityState } from '../_enums/states.enum';
import { AdditionalFieldsPart, AdditionalFieldsPartSchema } from './_parts/additionalFields.part.schema';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';
import { InitInfoPart, InitInfoPartSchema } from '~/management/identities/_schemas/_parts/init-info.part.schema';
import { MixedValue } from '~/_common/types/mixed-value.type';

export type IdentitiesDocument = Identities & Document;

@Schema({ versionKey: false })
export class Identities extends AbstractSchema {
  @Prop({ type: Number, enum: IdentityState, default: IdentityState.UNKNOWN })
  public state: IdentityState;

  @Prop({ type: Number, enum: IdentityLifecycle, default: IdentityLifecycle.INACTIVE })
  public lifecycle: IdentityLifecycle;

  @Prop({ type: inetOrgPersonSchema, required: true })
  public inetOrgPerson: inetOrgPerson;

  @Prop({ type: AdditionalFieldsPartSchema, required: false, default: {} })
  public additionalFields: AdditionalFieldsPart;

  @Prop({ type: String })
  public fingerprint: string;

  @Prop({ type: Date })
  public lastSync?: Date;

  @Prop({ type: Number, enum: InitStatesEnum, default: InitStatesEnum.NOSENT })
  public initState: InitStatesEnum;

  @Prop({ type: InitInfoPartSchema, default: {} })
  public initInfo: InitInfoPart;

  @Prop({
    type: Object,
  })
  public customFields?: { [key: string]: MixedValue }
}

export const IdentitiesSchema = SchemaFactory.createForClass(Identities);
