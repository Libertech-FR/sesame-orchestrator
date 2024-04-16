import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';

export type TasksDocument = Tasks & Document;

@Schema({ versionKey: false })
export class Tasks extends AbstractSchema {
  @Prop({ type: [Types.ObjectId] })
  public jobs?: Types.ObjectId[];
}

export const TasksSchema = SchemaFactory.createForClass(Tasks);
