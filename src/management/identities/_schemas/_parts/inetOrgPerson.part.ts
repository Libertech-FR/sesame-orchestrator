import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class inetOrgPerson extends Document {
  @Prop({ type: String, required: true })
  cn: string;

  @Prop({ type: String, default: null })
  displayName?: string;

  @Prop({ type: String, default: null })
  facsimileTelephoneNumber?: string;

  @Prop({ type: String, default: null })
  givenName?: string;

  @Prop({ type: String, default: null })
  labeledURI?: string;

  @Prop({ type: String, default: null })
  mail?: string;

  @Prop({ type: String, default: null })
  mobile?: string;

  @Prop({ type: String, default: null })
  postalAddress?: string;

  @Prop({ type: String, default: null })
  preferredLanguage?: string;

  @Prop({ type: String, required: true })
  sn: string;

  @Prop({ type: String, default: null })
  telephoneNumber?: string;

  @Prop({ type: String, default: null })
  title?: string;

  @Prop({ type: String, required: true })
  uid: string;

  @Prop({ type: String, required: true })
  employeeNumber: string;

  @Prop({ type: String, required: true })
  employeeType: string;

  @Prop({ type: String, required: true })
  departmentNumber: string;

  @Prop({ type: String, default: null })
  jpegPhoto?: string;

  // @Prop({ type: String, default: null })
  // userCertificate?: string;

  // @Prop({ type: String, default: null })
  // userPassword?: string;
}

export const inetOrgPersonSchema = SchemaFactory.createForClass(inetOrgPerson).index(
  { employeeNumber: 1, employeeType: 1 },
  { unique: true },
);
