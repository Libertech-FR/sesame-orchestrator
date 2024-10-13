import { IdentityLifecycle } from './../_enums/lifecycle.enum';
import { inetOrgPerson, inetOrgPersonSchema } from './_parts/inetOrgPerson.part';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { IdentityState } from '../_enums/states.enum';
import { AdditionalFieldsPart, AdditionalFieldsPartSchema } from './_parts/additionalFields.part.schema';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';
import { InitInfoPart, InitInfoPartSchema } from '~/management/identities/_schemas/_parts/init-info.part.schema';
import { MixedValue } from '~/_common/types/mixed-value.type';
import { AutoIncrementPlugin } from '~/_common/plugins/mongoose/auto-increment.plugin';
import { AutoIncrementPluginOptions } from '~/_common/plugins/mongoose/auto-increment.interface';

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
  public customFields?: { [key: string]: MixedValue };

  //pour les identités fusionnées ont met les deux identités sources
  @Prop({ type: Types.ObjectId, required: false })
  public srcFusionId: Types.ObjectId;

  //pour les identités qui on servit à une fusion on met la destination (la nouvelle identité fusionnée)
  @Prop({ type: Types.ObjectId, required: false })
  public destFusionId: Types.ObjectId;

  @Prop({ type: String, required: false, default: null })
  public primaryEmployeeNumber: string;
}

export const IdentitiesSchema = SchemaFactory.createForClass(Identities)
  .plugin(AutoIncrementPlugin, <AutoIncrementPluginOptions>{
    incrementBy: 1,
    field: 'inetOrgPerson.employeeNumber',
    startAt: 1,
    rules: (ctx) => {
      return ctx.inetOrgPerson.employeeType === 'LOCAL';
    },
  })
  .index(
    { 'inetOrgPerson.employeeNumber': 1, 'inetOrgPerson.employeeType': 1 },
    { unique: true },
  );
