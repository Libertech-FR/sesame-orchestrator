import { IdentityLifecycle } from '../../identities/_enums/lifecycle.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import {Identities} from "~/management/identities/_schemas/identities.schema";

@Schema({ versionKey: false, minimize: false, })
export class CycleDeVie extends AbstractSchema {

  @Prop({ type: Types.ObjectId, required: true })
  public refId: Types.ObjectId;

  @Prop({ type: Date })
  public date: Date;

  @Prop({ type: String, enum: IdentityLifecycle, default: IdentityLifecycle.INACTIVE })
  public lifecycle: IdentityLifecycle;


}
export const CycleDeVieSchema = SchemaFactory.createForClass(CycleDeVie)
