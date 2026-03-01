import mongoose, { Document, Schema } from 'mongoose'
import { ContentModerationAction, ModeratableContentType } from './ContentModerationEvent'
import { ContentModerationStatus } from './BaseContent'

export type AdminContentJobType = 'bulk_moderate' | 'bulk_rollback'
export type AdminContentJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
export type AdminContentJobItemStatus = 'pending' | 'success' | 'failed'

export interface AdminContentJobItem {
  contentType: ModeratableContentType
  contentId: string
  eventId?: string | null
  status: AdminContentJobItemStatus
  changed?: boolean
  fromStatus?: ContentModerationStatus
  toStatus?: ContentModerationStatus
  error?: string | null
  statusCode?: number | null
}

export interface AdminContentJobProgress {
  requested: number
  processed: number
  succeeded: number
  failed: number
  changed: number
}

export interface IAdminContentJob extends Document {
  type: AdminContentJobType
  status: AdminContentJobStatus
  actor: mongoose.Types.ObjectId
  action?: ContentModerationAction | null
  reason: string
  note?: string | null
  confirm?: boolean
  markFalsePositive?: boolean
  items: AdminContentJobItem[]
  progress: AdminContentJobProgress
  guardrails?: {
    maxItems: number
    confirmThreshold: number
    duplicatesSkipped: number
  } | null
  error?: string | null
  startedAt?: Date | null
  finishedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const AdminContentJobItemSchema = new Schema<AdminContentJobItem>(
  {
    contentType: {
      type: String,
      enum: ['article', 'video', 'course', 'live', 'podcast', 'book', 'comment', 'review'],
      required: true,
    },
    contentId: {
      type: String,
      required: true,
    },
    eventId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
      required: true,
    },
    changed: {
      type: Boolean,
      default: undefined,
    },
    fromStatus: {
      type: String,
      enum: ['visible', 'hidden', 'restricted'],
      default: undefined,
    },
    toStatus: {
      type: String,
      enum: ['visible', 'hidden', 'restricted'],
      default: undefined,
    },
    error: {
      type: String,
      default: null,
      maxlength: 500,
    },
    statusCode: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
  }
)

const AdminContentJobProgressSchema = new Schema<AdminContentJobProgress>(
  {
    requested: { type: Number, required: true, min: 0, default: 0 },
    processed: { type: Number, required: true, min: 0, default: 0 },
    succeeded: { type: Number, required: true, min: 0, default: 0 },
    failed: { type: Number, required: true, min: 0, default: 0 },
    changed: { type: Number, required: true, min: 0, default: 0 },
  },
  {
    _id: false,
  }
)

const AdminContentJobSchema = new Schema<IAdminContentJob>(
  {
    type: {
      type: String,
      enum: ['bulk_moderate', 'bulk_rollback'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'completed_with_errors', 'failed'],
      required: true,
      default: 'queued',
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
      enum: ['hide', 'unhide', 'restrict'],
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
    confirm: {
      type: Boolean,
      default: false,
    },
    markFalsePositive: {
      type: Boolean,
      default: false,
    },
    items: {
      type: [AdminContentJobItemSchema],
      default: [],
    },
    progress: {
      type: AdminContentJobProgressSchema,
      required: true,
      default: () => ({
        requested: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        changed: 0,
      }),
    },
    guardrails: {
      type: {
        maxItems: { type: Number, required: true },
        confirmThreshold: { type: Number, required: true },
        duplicatesSkipped: { type: Number, required: true, default: 0 },
      },
      default: null,
    },
    error: {
      type: String,
      default: null,
      maxlength: 500,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

AdminContentJobSchema.index({ createdAt: -1 })
AdminContentJobSchema.index({ type: 1, createdAt: -1 })
AdminContentJobSchema.index({ status: 1, createdAt: 1 })
AdminContentJobSchema.index({ actor: 1, createdAt: -1 })

export const AdminContentJob = mongoose.model<IAdminContentJob>(
  'AdminContentJob',
  AdminContentJobSchema
)
