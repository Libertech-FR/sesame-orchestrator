import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Information related to the account/identity initialization process.
 *
 * This schema is stored as a subdocument (no own _id) and
 * keeps track of the initialization timestamps.
 */
@Schema({ _id: false })
export class InitInfoPart extends Document {
  /**
   * Date when the initialization request/link was sent (email, SMS, etc.).
   * Undefined if no request has been sent yet.
   */
  @Prop({ type: Date })
  public sentDate?: Date;

  /**
   * Date when the user actually completed the initialization.
   * Undefined if the initialization has not been completed yet.
   */
  @Prop({ type: Date })
  public initDate?: Date;
}
export const InitInfoPartSchema = SchemaFactory.createForClass(InitInfoPart);
