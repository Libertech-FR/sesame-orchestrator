import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';

export type KeyringsDocument = Keyrings & Document;

@Schema({ versionKey: false })
export class Keyrings extends AbstractSchema {
  @Prop({
    type: String,
    unique: true,
  })
  public token: string;

  @Prop({
    type: [String],
  })
  public allowedNetworks?: string[];

  @Prop({ type: Date })
  public suspendedAt?: Date;
}

export const KeyringsSchema = SchemaFactory.createForClass(Keyrings);
