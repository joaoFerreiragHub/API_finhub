import mongoose, { Document, Schema } from 'mongoose'
import { ContentModerationAction, ModeratableContentType } from './ContentModerationEvent'
import { ContentModerationStatus } from './BaseContent'
import { AutomatedModerationSeverity } from './AutomatedModerationSignal'

export type AdminContentJobType = 'bulk_moderate' | 'bulk_rollback'
export type AdminContentJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
export type AdminContentJobItemStatus = 'pending' | 'success' | 'failed'
export type AdminContentJobApprovalStatus = 'draft' | 'review' | 'approved'

export interface AdminContentJobApprovalSampleItem {
  contentType: ModeratableContentType
  contentId: string
  eventId: string
  title: string
  targetStatus: ContentModerationStatus
  openReports: number
  uniqueReporters: number
  automatedSeverity: AutomatedModerationSeverity
  creatorRiskLevel: 'low' | 'medium' | 'high' | 'critical' | null
  requiresConfirm: boolean
  warnings: string[]
}

export interface AdminContentJobApproval {
  required: boolean
  reviewStatus: AdminContentJobApprovalStatus
  reviewNote?: string | null
  reviewRequestedAt?: Date | null
  reviewRequestedBy?: mongoose.Types.ObjectId | null
  approvalNote?: string | null
  approvedAt?: Date | null
  approvedBy?: mongoose.Types.ObjectId | null
  sampleRequired: boolean
  recommendedSampleSize: number
  reviewedSampleKeys: string[]
  sampleItems: AdminContentJobApprovalSampleItem[]
  riskSummary: {
    restoreVisibleCount: number
    activeRiskCount: number
    highRiskCount: number
    criticalRiskCount: number
    falsePositiveEligibleCount: number
  }
  falsePositiveValidationRequired: boolean
  falsePositiveValidated: boolean
}

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
  attemptCount: number
  maxAttempts: number
  guardrails?: {
    maxItems: number
    confirmThreshold: number
    duplicatesSkipped: number
  } | null
  error?: string | null
  workerId?: string | null
  leaseExpiresAt?: Date | null
  lastHeartbeatAt?: Date | null
  lastAttemptAt?: Date | null
  approval?: AdminContentJobApproval | null
  startedAt?: Date | null
  finishedAt?: Date | null
  expiresAt?: Date | null
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

const AdminContentJobApprovalSampleItemSchema = new Schema<AdminContentJobApprovalSampleItem>(
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
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 160,
    },
    targetStatus: {
      type: String,
      enum: ['visible', 'hidden', 'restricted'],
      required: true,
    },
    openReports: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    uniqueReporters: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    automatedSeverity: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical'],
      required: true,
      default: 'none',
    },
    creatorRiskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: null,
    },
    requiresConfirm: {
      type: Boolean,
      required: true,
      default: false,
    },
    warnings: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
)

const AdminContentJobApprovalSchema = new Schema<AdminContentJobApproval>(
  {
    required: {
      type: Boolean,
      default: false,
    },
    reviewStatus: {
      type: String,
      enum: ['draft', 'review', 'approved'],
      default: 'draft',
    },
    reviewNote: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    reviewRequestedAt: {
      type: Date,
      default: null,
    },
    reviewRequestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalNote: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sampleRequired: {
      type: Boolean,
      default: false,
    },
    recommendedSampleSize: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reviewedSampleKeys: {
      type: [String],
      default: [],
    },
    sampleItems: {
      type: [AdminContentJobApprovalSampleItemSchema],
      default: [],
    },
    riskSummary: {
      type: {
        restoreVisibleCount: { type: Number, required: true, min: 0, default: 0 },
        activeRiskCount: { type: Number, required: true, min: 0, default: 0 },
        highRiskCount: { type: Number, required: true, min: 0, default: 0 },
        criticalRiskCount: { type: Number, required: true, min: 0, default: 0 },
        falsePositiveEligibleCount: { type: Number, required: true, min: 0, default: 0 },
      },
      required: true,
      default: () => ({
        restoreVisibleCount: 0,
        activeRiskCount: 0,
        highRiskCount: 0,
        criticalRiskCount: 0,
        falsePositiveEligibleCount: 0,
      }),
    },
    falsePositiveValidationRequired: {
      type: Boolean,
      default: false,
    },
    falsePositiveValidated: {
      type: Boolean,
      default: false,
    },
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
    attemptCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      required: true,
      min: 1,
      default: 3,
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
    workerId: {
      type: String,
      default: null,
      maxlength: 200,
    },
    leaseExpiresAt: {
      type: Date,
      default: null,
    },
    lastHeartbeatAt: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    approval: {
      type: AdminContentJobApprovalSchema,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
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
AdminContentJobSchema.index({ status: 1, startedAt: 1 })
AdminContentJobSchema.index({ status: 1, leaseExpiresAt: 1 })
AdminContentJobSchema.index({ actor: 1, createdAt: -1 })
AdminContentJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const AdminContentJob = mongoose.model<IAdminContentJob>(
  'AdminContentJob',
  AdminContentJobSchema
)
