import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PasswordHistoryDocument = PasswordHistory & Document;

@Schema({ versionKey: false, minimize: false, timestamps: true })
export class PasswordHistory {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  public identityId: Types.ObjectId;

  @Prop({ type: String, required: true })
  public passwordHash: string;

  /**
   * SHA-1(password) chiffré (AES-256-GCM), utilisé uniquement pour re-check HIBP en cron.
   */
  @Prop({ type: String, required: false, default: null })
  public hibpSha1Enc?: string | null;

  @Prop({ type: Date, required: false, default: null })
  public hibpLastCheckAt?: Date | null;

  @Prop({ type: Number, required: false, default: null })
  public hibpPwnCount?: number | null;

  @Prop({ type: String, required: false, default: null })
  public source?: 'change' | 'reset' | 'force' | null;

  @Prop({ type: Date, required: false, default: null })
  public expiresAt?: Date | null;

  /**
   * Jours "J-*" déjà notifiés pour cette entrée (évite les doublons de rappel).
   */
  @Prop({ type: [Number], required: false, default: [] })
  public passwordExpiryReminderSentDays?: number[];

  @Prop({ type: Date, required: false, default: null })
  public passwordExpiryReminderLastSentAt?: Date | null;
}

export const PasswordHistorySchema = SchemaFactory.createForClass(PasswordHistory)
  .index({ identityId: 1, createdAt: -1 })
  .index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
