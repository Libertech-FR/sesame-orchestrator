import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class inetOrgPerson extends Document {
  @Prop({ required: true })
  cn: string;

  @Prop()
  displayName?: string;

  @Prop()
  facsimileTelephoneNumber?: string;

  @Prop()
  givenName?: string;

  @Prop()
  labeledURI?: string;

  @Prop()
  mail?: string;

  @Prop()
  mobile?: string;

  @Prop()
  postalAddress?: string;

  @Prop()
  preferredLanguage?: string;

  @Prop({ required: true })
  sn: string;

  @Prop()
  telephoneNumber?: string;

  @Prop()
  title?: string;

  @Prop({ required: true })
  uid: string;

  @Prop({ required: true })
  employeeNumber: string;

  @Prop({ required: true })
  employeeType: string;

  @Prop()
  departmentNumber: string;

  @Prop()
  userCertificate?: string;

  @Prop()
  userPassword?: string;
}

export const inetOrgPersonSchema = SchemaFactory.createForClass(inetOrgPerson).index(
  { employeeNumber: 1, employeeType: 1 },
  { unique: true },
);
