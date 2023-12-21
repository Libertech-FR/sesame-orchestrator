import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class inetOrgPerson {
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

  @Prop({ required: true, unique: true })
  uid: string;

  @Prop()
  userCertificate?: string;

  @Prop()
  userPassword?: string;
}

export const inetOrgPersonSchema = SchemaFactory.createForClass(inetOrgPerson);
