import mongoose, { Document, Schema } from 'mongoose'

export type ClaimTargetType =
  | 'article'
  | 'video'
  | 'course'
  | 'live'
  | 'podcast'
  | 'book'
  | 'directory_entry'

export type ClaimRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface IClaimRequest extends Document {
  targetType: ClaimTargetType
  targetId: string
  creatorId: mongoose.Types.ObjectId
  requestedBy: mongoose.Types.ObjectId
  status: ClaimRequestStatus
  reason: string
  note?: string
  evidenceLinks: string[]
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  reviewNote?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const ClaimRequestSchema = new Schema<IClaimRequest>(
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
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
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
    evidenceLinks: {
      type: [String],
      default: [],
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
      index: true,
    },
    reviewNote: {
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
    timestamps: true,
  }
)

ClaimRequestSchema.index({ status: 1, createdAt: -1 })
ClaimRequestSchema.index({ targetType: 1, targetId: 1, status: 1 })
ClaimRequestSchema.index({ creatorId: 1, status: 1, createdAt: -1 })
ClaimRequestSchema.index(
  { targetType: 1, targetId: 1, creatorId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
)

export const ClaimRequest = mongoose.model<IClaimRequest>('ClaimRequest', ClaimRequestSchema)
