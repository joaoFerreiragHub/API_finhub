import mongoose, { Document, Schema } from 'mongoose'
import { ModeratableContentType } from './ContentModerationEvent'

export type ModerationAppealStatus =
  | 'open'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'closed'

export type ModerationAppealSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ModerationAppealReasonCategory =
  | 'false_positive'
  | 'context_missing'
  | 'policy_dispute'
  | 'other'

export interface ModerationAppealHistoryEntry {
  fromStatus: ModerationAppealStatus
  toStatus: ModerationAppealStatus
  changedBy: mongoose.Types.ObjectId
  reason: string
  note?: string | null
  changedAt: Date
}

export interface IModerationAppeal extends Document {
  moderationEvent: mongoose.Types.ObjectId
  contentType: ModeratableContentType
  contentId: string
  appellant: mongoose.Types.ObjectId
  status: ModerationAppealStatus
  severity: ModerationAppealSeverity
  reasonCategory: ModerationAppealReasonCategory
  reason: string
  note?: string | null
  slaHours: number
  openedAt: Date
  firstResponseAt?: Date | null
  resolvedAt?: Date | null
  dueAt: Date
  createdBy: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId | null
  version: number
  history: ModerationAppealHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const ModerationAppealHistoryEntrySchema = new Schema<ModerationAppealHistoryEntry>(
  {
    fromStatus: {
      type: String,
      enum: ['open', 'under_review', 'accepted', 'rejected', 'closed'],
      required: true,
    },
    toStatus: {
      type: String,
      enum: ['open', 'under_review', 'accepted', 'rejected', 'closed'],
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
)

const ModerationAppealSchema = new Schema<IModerationAppeal>(
  {
    moderationEvent: {
      type: Schema.Types.ObjectId,
      ref: 'ContentModerationEvent',
      required: true,
      unique: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['article', 'video', 'course', 'live', 'podcast', 'book', 'comment', 'review'],
      required: true,
      index: true,
    },
    contentId: {
      type: String,
      required: true,
      index: true,
    },
    appellant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'accepted', 'rejected', 'closed'],
      required: true,
      default: 'open',
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      default: 'medium',
      index: true,
    },
    reasonCategory: {
      type: String,
      enum: ['false_positive', 'context_missing', 'policy_dispute', 'other'],
      required: true,
      default: 'other',
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
    slaHours: {
      type: Number,
      required: true,
      min: 1,
      max: 168,
      default: 48,
    },
    openedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    firstResponseAt: {
      type: Date,
      default: null,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
      index: true,
    },
    dueAt: {
      type: Date,
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    history: {
      type: [ModerationAppealHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

ModerationAppealSchema.index({ moderationEvent: 1 }, { unique: true })
ModerationAppealSchema.index({ appellant: 1, status: 1, openedAt: -1 })
ModerationAppealSchema.index({ status: 1, dueAt: 1, openedAt: -1 })
ModerationAppealSchema.index({ severity: 1, status: 1, openedAt: -1 })
ModerationAppealSchema.index({ contentType: 1, contentId: 1, status: 1, openedAt: -1 })

export const ModerationAppeal = mongoose.model<IModerationAppeal>(
  'ModerationAppeal',
  ModerationAppealSchema
)
