import {Prop, Schema} from "@nestjs/mongoose";
import {Document} from "mongoose";

Schema({ _id: false })
export class InitInfoPartSchema extends Document{
  @Prop({type:Date})
  sentDate?: Date
  @Prop({type:Date})
  initDate?: Date
}
