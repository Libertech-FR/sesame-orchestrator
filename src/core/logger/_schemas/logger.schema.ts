import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { DataPart, DataPartSchema } from './_parts/data.part.schema';

export const DEFAULT_CONTEXT = 'default';
export type LoggerDocument = Logger & Document;

@Schema({ versionKey: false })
export class Logger extends AbstractSchema {
  @Prop({
    type: String,
    required: true,
  })
  public level: string;

  @Prop({
    type: DataPartSchema,
    required: true,
    default: {},
  })
  public data: DataPart;

  /**
   * @description The context of the log message.
   * @example 'identity'
   */
  @Prop({ type: String })
  public context?: string;

  /**
   * @description The concerned document in collection of the log message.
   * @example '5f7b1b3b7f7b1b3b7f7b1b3b'
   */
  @Prop({ type: String })
  public concerned?: string;
}

export const LoggerSchema = SchemaFactory.createForClass(Logger).pre(
  'save',
  function (this: Logger, next: () => void): void {
    this.context = this.context.toLocaleLowerCase() || DEFAULT_CONTEXT;
    this.concerned = this.concerned.toLocaleLowerCase() || null;
    next();
  },
);
