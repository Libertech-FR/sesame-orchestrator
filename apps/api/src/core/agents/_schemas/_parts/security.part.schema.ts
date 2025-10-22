import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class SecurityPart extends Document {
  @Prop({
    type: [String],
    default: [],
  })
  public oldPasswords?: string[];

  @Prop({
    type: String,
  })
  public otpKey?: string;

  @Prop({
    type: [String],
  })
  public u2fKey?: string[];

  @Prop({
    type: [String],
  })
  public allowedNetworks?: string[];

  @Prop({
    type: Boolean,
    default: false,
  })
  public changePwdAtNextLogin: boolean;

  @Prop({
    type: String,
  })
  public secretKey: string;
}

export const SecurityPartSchema = SchemaFactory.createForClass(SecurityPart);
