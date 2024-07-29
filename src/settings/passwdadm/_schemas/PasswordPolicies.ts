import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {Identities} from "~/management/identities/_schemas/identities.schema";

export type PasswordPoliciesDocument = Identities & Document;

@Schema({ versionKey: false })
export class PasswordPolicies extends AbstractSchema {
  @Prop({ type: Number, default: 10 })
  len: Number;

  @Prop({ type: Number,default:1 })
  hasUpperCase: Number;

  @Prop({ type: Number,default:1 })
  hasLowerCase: Number;

  @Prop({ type: Number,default:1 })
  hasNumbers: Number;

  @Prop({ type: Number,default:1 })
  hasSpecialChars: Number;

  @Prop({ type: Number,default:20 })
  minComplexity: Number;

  @Prop({ type: Number,default:60 })
  goodComplexity: Number;

  @Prop({ type: Boolean,default:true })
  checkPwned: Boolean;

  @Prop({ type: Number,default:10 })
  maxRetry: Number;

  @Prop({ type: Number,default:3600 })
  bannedTime: Number;
  @Prop({ type: Boolean,default:true })
  resetBySms: Boolean;

  @Prop({ type: String,default:'https://google.fr' })
  redirectUrl: String;
}

export const PasswordPoliciesSchema = SchemaFactory.createForClass(PasswordPolicies);
