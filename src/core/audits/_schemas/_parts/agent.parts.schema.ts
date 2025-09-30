import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class AgentPart extends Document {
  @Prop({ type: String, required: true })
  public $ref: string;

  @Prop({ type: Types.ObjectId, required: true })
  public id: Types.ObjectId;

  @Prop({ type: String })
  public name?: string;
}

export const AgentPartSchema = SchemaFactory.createForClass(AgentPart);
