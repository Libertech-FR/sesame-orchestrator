import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { AC_ACTIONS, AC_POSSESSIONS } from '~/_common/types/ac-types'

@Schema({ _id: false })
export class AccessPart extends Document {
  @Prop({
    required: true,
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: (v: string) => {
        return v.length > 0 && v.includes('/') && v.startsWith('/') && !v.endsWith('/')
      },
      message: 'Le champ resource doit êt renseigné et correspondre au chemin d\'accès d\'une route NestJS ex: "/core/roles"',
    },
  })
  public resource: string

  @Prop({
    required: true,
    type: [String],
    enum: AC_ACTIONS,
  })
  public action: AC_ACTIONS[]

  @Prop({
    type: String,
    enum: AC_POSSESSIONS,
    default: AC_POSSESSIONS.ANY,
  })
  public possession: AC_POSSESSIONS

  @Prop({
    type: [String],
    default: [],
  })
  public attributes: string[]
}

/**
 * Factory pour créer le schéma Mongoose à partir de la classe AccessPart.
 */
export const AccessPartSchema = SchemaFactory.createForClass(AccessPart)
