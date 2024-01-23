import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';

export type LoggerDocument = Logger & Document;

@Schema({ versionKey: false })
export class Logger extends AbstractSchema {}

export const LoggerSchema = SchemaFactory.createForClass(Logger);
