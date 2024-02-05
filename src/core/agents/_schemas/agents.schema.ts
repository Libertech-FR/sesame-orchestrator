import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { AbstractSchema } from "~/_common/abstracts/schemas/abstract.schema";

@Schema({ versionKey: false })
export class Agents extends AbstractSchema {
  @Prop({
    type: String,
    required: true,
    unique: true,
  })
  public username: string

  @Prop({
    type: String,
    required: true,
    unique: true,
  })
  public email: string

  @Prop({
    type: String,
    required: true,
  })
  public password: string
}

export const AgentsSchema = SchemaFactory.createForClass(Agents)
