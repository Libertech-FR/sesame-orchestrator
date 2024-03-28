import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const DEFAULT_DATA_TYPE = 'default';

@Schema({ _id: false })
export class DataPart extends Document {
  @Prop({
    type: String,
    default: DEFAULT_DATA_TYPE,
  })
  public type?: string;

  @Prop({
    type: String,
    required: true,
  })
  public message: string;
}

export const DataPartSchema = SchemaFactory.createForClass(DataPart);
