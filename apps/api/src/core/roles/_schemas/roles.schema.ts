import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "~/_common/abstracts/schemas/abstract.schema"
import { AccessPart, AccessPartSchema } from "./_parts/access.part.schema"
import { AC_ADMIN_ROLE, AC_GUEST_ROLE, AC_INTERNAL_ROLE_PREFIX } from "~/_common/types/ac-types"

@Schema({ versionKey: false })
export class Roles extends AbstractSchema {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (v: string) => {
        return v.length > 0
          && !v.includes(' ')
          && !!/[a-z0-9-_]+/.test(v)
          && !v.startsWith(AC_INTERNAL_ROLE_PREFIX)
          && ![AC_ADMIN_ROLE, AC_GUEST_ROLE].includes(v)
      },
      message: 'Le nom doit être composé de lettres, de chiffres, de tirets et de underscores et ne peut pas être un mot reservé.',
    },
  })
  public name: string

  @Prop({
    type: String,
    required: true,
  })
  public displayName: string

  @Prop({
    type: String,
    required: true,
  })
  public description: string

  @Prop({
    type: [String],
    default: ['guest'],
    trim: true,
    lowercase: true,
  })
  public inherits?: string[]

  @Prop({
    type: [AccessPartSchema],
    default: [],
  })
  public access: AccessPart[]
}

export const RolesSchema = SchemaFactory.createForClass(Roles)
