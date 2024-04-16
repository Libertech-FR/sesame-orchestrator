import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { JobState } from '../_enums/state.enum';

export type JobsDocument = Jobs & Document;

@Schema({ versionKey: false })
export class Jobs extends AbstractSchema {
  @Prop({
    type: String,
    required: true,
  })
  public jobId: string;

  @Prop({
    type: String,
    required: true,
  })
  public action: string;

  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  public concernedTo?: Types.ObjectId;

  @Prop({ type: String })
  public comment?: string;

  @Prop({ type: Object, default: {} })
  public params?: object;

  @Prop({ type: Object, default: {} })
  public result?: object;

  @Prop({ type: Date })
  public processedAt?: Date;

  @Prop({ type: Date })
  public finishedAt?: Date;

  @Prop({ type: Number, enum: JobState, default: JobState.CREATED })
  state: JobState;
}

export const JobsSchema = SchemaFactory.createForClass(Jobs);
