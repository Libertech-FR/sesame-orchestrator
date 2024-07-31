import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

<<<<<<< HEAD
export type SettingsDocument = Document;

@Schema({ versionKey: false })
export class Settings extends AbstractSchema {
  @Prop({ type: String, default: '', required: true, unique: true })
  name: string;
  @Prop({ type: Object, default: {} })
  parameters: object;
=======
export type SettingsDocument =  Document;

@Schema({ versionKey: false })
export class Settings extends AbstractSchema {
  @Prop({ type: String, default: "" ,required: true, unique: true,})
  name: string
  @Prop({type: Object, default:{}})
  parameters: object

>>>>>>> 85a4ce7 (save)
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
