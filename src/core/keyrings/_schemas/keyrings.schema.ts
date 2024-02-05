import { Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';

export type KeyringsDocument = Keyrings & Document

@Schema({ versionKey: false })
export class Keyrings extends AbstractSchema {}

export const KeyringsSchema = SchemaFactory.createForClass(Keyrings)
