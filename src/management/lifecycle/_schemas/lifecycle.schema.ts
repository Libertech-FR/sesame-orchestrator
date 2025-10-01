import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { IdentityLifecycleDefault } from '~/management/identities/_enums/lifecycle.enum';

export type LifecycleDocument = Lifecycle & Document;

export const LifecycleRefId = 'refId';

@Schema({ versionKey: false, minimize: false })
export class Lifecycle extends AbstractSchema {
  @Prop({
    type: Types.ObjectId,
    ref: 'Identities',
    required: true,
  })
  public refId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  public lifecycle: IdentityLifecycleDefault | string;

  @Prop({
    type: Date,
    default: Date.now,
  })
  public date: Date;
}

export const LifecycleSchema = SchemaFactory.createForClass(Lifecycle);
