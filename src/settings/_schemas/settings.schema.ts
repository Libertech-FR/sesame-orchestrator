import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type SettingsDocument = Document;

@Schema({ versionKey: false })
export class Settings extends AbstractSchema {
  @Prop({ type: String, default: '', required: true, unique: true })
  name: string;
  @Prop({ type: Object, default: {} })
  parameters: object;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
