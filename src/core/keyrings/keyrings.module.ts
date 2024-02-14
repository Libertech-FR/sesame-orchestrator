import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { KeyringsSchema, Keyrings } from "~/core/keyrings/_schemas/keyrings.schema";
import { KeyringsService } from "./keyrings.service";
import { KeyringsController } from "./keyrings.controller";

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Keyrings.name,
        useFactory: () => KeyringsSchema
      }
    ])
  ],
  providers: [KeyringsService],
  controllers: [KeyringsController]
})
export class KeyringsModule {
}
