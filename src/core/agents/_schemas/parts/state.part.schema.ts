import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AgentState, AgentStateList } from '~/core/agents/_enum/agent-state.enum';

@Schema({ _id: false })
export class StatePart extends Document {
  @Prop({
    required: true,
    type: Number,
    enum: AgentStateList,
    default: AgentState.PENDING,
  })
  public current: number;

  @Prop({
    type: Date,
    default: new Date(),
  })
  public lastChangedAt?: Date;

  @Prop({ type: Date })
  public suspendedAt?: Date;

  @Prop({ type: Date })
  public suspendedUntil?: Date;

  @Prop({ type: String })
  public suspendedReason?: string;
}

export const StatePartSchema = SchemaFactory.createForClass(StatePart);
