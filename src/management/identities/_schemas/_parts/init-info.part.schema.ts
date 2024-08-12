import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Identities } from '~/management/identities/_schemas/identities.schema';

@Schema({ _id: false })
export class InitInfoPart extends Document {
  @Prop({ type: Date })
  sentDate?: Date;
  @Prop({ type: Date })
  initDate?: Date;
}
export const InitInfoPartSchema = SchemaFactory.createForClass(InitInfoPart);
