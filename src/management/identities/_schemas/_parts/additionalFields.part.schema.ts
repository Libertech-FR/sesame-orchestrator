import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MixedValue } from '~/_common/types/mixed-value.type';

@Schema({ _id: false })
export class AdditionalFieldsPart extends Document {
  @Prop({ type: Array, of: String, required: true, default: ['inetOrgPerson'] })
  objectClasses: string[];

  @Prop({ type: Object, required: true })
  attributes: Record<string, MixedValue>;

  @Prop({ type: Object, required: false })
  validations?: Record<string, string>;
}

export const AdditionalFieldsPartSchema = SchemaFactory.createForClass(AdditionalFieldsPart);
