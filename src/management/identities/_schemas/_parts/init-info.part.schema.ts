import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class InitInfoPart extends Document {
  @Prop({ type: Date })
  public sentDate?: Date;

  @Prop({ type: Date })
  public initDate?: Date;
}
export const InitInfoPartSchema = SchemaFactory.createForClass(InitInfoPart);
