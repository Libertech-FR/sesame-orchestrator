import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { AbstractSchema } from "~/_common/abstracts/schemas/abstract.schema";
import { StatePart, StatePartSchema } from "~/core/agents/_schemas/parts/state.part.schema";
import { SecurityPart, SecurityPartSchema } from "~/core/agents/_schemas/parts/security.part.schema";
import { MixedValue } from "~/_common/types/mixed-value.type";

const DEFAULT_THIRD_PARTY_AUTH = "local";

@Schema({ versionKey: false })
export class Agents extends AbstractSchema {
  // @Prop({
  //   type: Types.ObjectId,
  //   required: true,
  //   unique: true,
  // })
  // public entityId: Types.ObjectId

  @Prop({
    type: String,
    required: true,
    unique: true
  })
  public username: string;

  @Prop({
    type: String
  })
  public displayName: string;

  @Prop({
    type: String,
    required: true,
    unique: true
  })
  public email: string;

  @Prop({
    type: String,
    required: true
  })
  public password: string;

  @Prop({
    type: String,
    default: DEFAULT_THIRD_PARTY_AUTH
  })
  public thirdPartyAuth: string;

  @Prop({
    type: StatePartSchema,
    required: true,
    default: {}
  })
  public state: StatePart;

  @Prop({
    type: String,
    default: "/"
  })
  public baseURL: string;

  @Prop({
    type: SecurityPartSchema
  })
  public security: SecurityPart;

  @Prop({
    type: Object
  })
  public customFields?: { [key: string]: MixedValue };
}

export const AgentsSchema = SchemaFactory.createForClass(Agents).pre("save", function(this: Agents, next: () => void): void {
  if (this.isNew) {
    this.displayName = this.displayName || this.username;
  }
  next();
});

