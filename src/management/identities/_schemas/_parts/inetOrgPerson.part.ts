import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class inetOrgPerson {
  @Prop({ required: true })
  cn: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  facsimileTelephoneNumber: string;

  @Prop({ required: true })
  givenName: string;

  @Prop({ required: true })
  labeledURI: string;

  @Prop({ required: true })
  mail: string;

  @Prop()
  mobile: string;

  @Prop({ required: true })
  postalAddress: string;

  @Prop({ required: true })
  preferredLanguage: string;

  @Prop({ required: true })
  sn: string;

  @Prop({ required: true })
  telephoneNumber: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  uid: string;

  @Prop({ required: true })
  userCertificate: string;

  @Prop({ required: true })
  userPassword: string;
}

export const inetOrgPersonSchema = SchemaFactory.createForClass(inetOrgPerson);
