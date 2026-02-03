import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class inetOrgPerson extends Document {
  @Prop({ type: String, required: true })
  public cn: string;

  @Prop({ type: String, default: null })
  public displayName?: string;

  @Prop({ type: String, default: null })
  public facsimileTelephoneNumber?: string;

  @Prop({ type: String, default: null })
  public givenName?: string;

  @Prop({ type: String, default: null })
  public labeledURI?: string;

  @Prop({ type: String, default: null })
  public mail?: string;

  @Prop({ type: String, default: null })
  public mobile?: string;

  @Prop({ type: String, default: null })
  public postalAddress?: string;

  @Prop({ type: String, default: null })
  public preferredLanguage?: string;

  @Prop({ type: String, required: true })
  public sn: string;

  @Prop({ type: String, default: null })
  public telephoneNumber?: string;

  @Prop({ type: String, default: null })
  public title?: string;

  @Prop({ type: String, required: true })
  public uid: string;

  @Prop({
    type: Array,
    of: String,
    validate: [
      {
        validator: (employeeNumbers: string[]) => {
          if (!Array.isArray(employeeNumbers)) return false;

          return employeeNumbers.every((employeeNumber) => /[A-Za-z0-9_-]+/.test(employeeNumber));
        },
        message: 'EmployeeNumber invalide.',
      },
    ],
  })
  public employeeNumber: string[];

  @Prop({ type: String, required: true })
  public employeeType: string;

  @Prop({ type: Array, of: String, required: true, default: [] })
  public departmentNumber: string[];

  @Prop({ type: String, default: null })
  public jpegPhoto?: string;

  // @Prop({ type: String, default: null })
  // public photo?: string;

  @Prop({ type: String, default: null })
  public userCertificate?: string;

  // @Prop({ type: String, default: null })
  // public userPassword?: string;
}

export const inetOrgPersonSchema = SchemaFactory.createForClass(inetOrgPerson);
