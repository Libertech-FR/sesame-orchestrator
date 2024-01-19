import { Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { Abstract } from '~/_common/abstracts/abstract/schemas/abstract.schema'

export type LoggerDocument = Logger & Document

@Schema({ versionKey: false })
export class Logger extends AbstractSchema {}

export const LoggerSchema = SchemaFactory.createForClass(Logger)
