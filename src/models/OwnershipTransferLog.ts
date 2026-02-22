import mongoose, { Document, Schema } from 'mongoose'

export type OwnershipEntityType =
  | 'article'
  | 'video'
  | 'course'
  | 'live'
  | 'podcast'
  | 'book'
  | 'directory_entry'

export type OwnershipEntityOwnerType = 'admin_seeded' | 'creator_owned'

export interface IOwnershipTransferLog extends Document {
  targetType: OwnershipEntityType
  targetId: string
  fromOwnerType: OwnershipEntityOwnerType
  toOwnerType: OwnershipEntityOwnerType
  fromOwnerUser?: mongoose.Types.ObjectId
  toOwnerUser?: mongoose.Types.ObjectId
  transferredBy: mongoose.Types.ObjectId
  reason: string
  note?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const OwnershipTransferLogSchema = new Schema<IOwnershipTransferLog>(
  {
    targetType: {
      type: String,
      enum: ['article', 'video', 'course', 'live', 'podcast', 'book', 'directory_entry'],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    fromOwnerType: {
      type: String,
      enum: ['admin_seeded', 'creator_owned'],
      required: true,
      index: true,
    },
    toOwnerType: {
      type: String,
      enum: ['admin_seeded', 'creator_owned'],
      required: true,
      index: true,
    },
    fromOwnerUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    toOwnerUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    transferredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
      trim: true,
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

OwnershipTransferLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 })
OwnershipTransferLogSchema.index({ transferredBy: 1, createdAt: -1 })

export const OwnershipTransferLog = mongoose.model<IOwnershipTransferLog>(
  'OwnershipTransferLog',
  OwnershipTransferLogSchema
)
