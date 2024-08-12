import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

<<<<<<< HEAD
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
=======
export type SettingsDocument = Document;

@Schema({ versionKey: false })
export class Settings extends AbstractSchema {
  @Prop({ type: String, default: '', required: true, unique: true })
  name: string;
  @Prop({ type: Object, default: {} })
  parameters: object;
>>>>>>> 0cb4493 (chore: Update filestorage configuration for identities module)
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
