import { AbstractSchema } from '~/_common/abstracts/schemas/abstract.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {Identities} from "~/management/identities/_schemas/identities.schema";

export type PasswordPoliciesDocument = Identities & Document;

@Schema({ versionKey: false })
export class PasswordPolicies extends AbstractSchema {
  @Prop({ type: Number, default: 10 })
  len: number;

  @Prop({ type: Number,default:1 })
  hasUpperCase: number;

  @Prop({ type: Number,default:1 })
  hasLowerCase: number;

  @Prop({ type: Number,default:1 })
  hasNumbers: number;

  @Prop({ type: Number,default:1 })
  hasSpecialChars: number;

  @Prop({ type: Number,default:20 })
  minComplexity: number;

  @Prop({ type: Number,default:60 })
  goodComplexity: number;

  @Prop({ type: Boolean,default:true })
  checkPwned: boolean;

  @Prop({ type: Number,default:10 })
  maxRetry: number;

  @Prop({ type: Number,default:3600 })
  bannedTime: number;
  @Prop({ type: Boolean,default:true })
  resetBySms: boolean;

  @Prop({ type: String,default:'https://google.fr' })
  redirectUrl: string;
}

export const PasswordPoliciesSchema = SchemaFactory.createForClass(PasswordPolicies);
