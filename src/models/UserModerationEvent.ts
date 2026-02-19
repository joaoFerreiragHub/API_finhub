import mongoose, { Document, Schema } from 'mongoose'
import { UserAccountStatus } from './User'

export type UserModerationAction = 'status_change' | 'force_logout' | 'internal_note'

export interface IUserModerationEvent extends Document {
  user: mongoose.Types.ObjectId
  actor: mongoose.Types.ObjectId
  action: UserModerationAction
  fromStatus?: UserAccountStatus
  toStatus?: UserAccountStatus
  reason: string
  note?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const UserModerationEventSchema = new Schema<IUserModerationEvent>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['status_change', 'force_logout', 'internal_note'],
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: null,
    },
    toStatus: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    note: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

UserModerationEventSchema.index({ createdAt: -1 })
UserModerationEventSchema.index({ user: 1, createdAt: -1 })
UserModerationEventSchema.index({ actor: 1, createdAt: -1 })
UserModerationEventSchema.index({ action: 1, createdAt: -1 })

export const UserModerationEvent = mongoose.model<IUserModerationEvent>(
  'UserModerationEvent',
  UserModerationEventSchema
)
