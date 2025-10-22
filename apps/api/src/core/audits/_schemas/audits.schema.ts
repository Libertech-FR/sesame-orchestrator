import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { AgentPart, AgentPartSchema } from './_parts/agent.parts.schema';
import { ChangesType } from '~/_common/plugins/mongoose/history.plugin';

export enum AuditOperation {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  REPLACE = 'replace',
}

export type AuditsDocument = Audits & Document;

@Schema({ versionKey: false, collection: 'audits' })
export class Audits extends AbstractSchema {
  @Prop({
    type: String,
    required: true,
  })
  public coll!: string;

  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  public documentId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: AuditOperation,
  })
  public op!: 'insert' | 'update' | 'delete' | 'replace';

  @Prop({
    type: AgentPartSchema,
    required: true,
  })
  public agent!: AgentPart;

  @Prop({ type: Object })
  public data?: Document;

  @Prop({ type: Array, of: Object })
  public changes?: ChangesType[];
}

export const AuditsSchema = SchemaFactory.createForClass(Audits);
