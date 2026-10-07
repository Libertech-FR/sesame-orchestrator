import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';

export type GroupFamiliesDocument = GroupFamilies & Document;

/**
 * Famille de groupes : permet de classer les groupes d'identités (ex. services, projets, listes de diffusion)
 */
@Schema({ versionKey: false, minimize: false })
export class GroupFamilies extends AbstractSchema {
  @Prop({ type: String, required: true, unique: true, trim: true })
  public name: string;

  @Prop({ type: String, default: null })
  public description?: string;

  @Prop({ type: String, default: null })
  public color?: string;
}

export const GroupFamiliesSchema = SchemaFactory.createForClass(GroupFamilies);
