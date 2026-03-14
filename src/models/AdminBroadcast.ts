import mongoose, { Document, Schema } from 'mongoose'
import { UserAccountStatus, UserRole } from './User'

export type AdminBroadcastStatus = 'draft' | 'approved' | 'sent' | 'failed' | 'canceled'
export type AdminBroadcastChannel = 'in_app'

export interface AdminBroadcastSegment {
  roles: UserRole[]
  accountStatuses: UserAccountStatus[]
  includeUsers: mongoose.Types.ObjectId[]
  excludeUsers: mongoose.Types.ObjectId[]
  lastActiveWithinDays?: number | null
}

export interface AdminBroadcastApproval {
  required: boolean
  approvedAt?: Date | null
  approvedBy?: mongoose.Types.ObjectId | null
  reason?: string | null
}

export interface AdminBroadcastDelivery {
  attempted: number
  sent: number
  failed: number
  sentAt?: Date | null
  lastError?: string | null
}

export interface AdminBroadcastHistoryEntry {
  action: 'created' | 'approved' | 'send_started' | 'sent' | 'failed' | 'canceled'
  changedBy: mongoose.Types.ObjectId
  reason?: string | null
  note?: string | null
  metadata?: Record<string, unknown> | null
  changedAt: Date
}

export interface IAdminBroadcast extends Document {
  title: string
  message: string
  channel: AdminBroadcastChannel
  status: AdminBroadcastStatus
  segment: AdminBroadcastSegment
  audienceEstimate: number
  approval: AdminBroadcastApproval
  delivery: AdminBroadcastDelivery
  createdBy: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId | null
  version: number
  history: AdminBroadcastHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const AdminBroadcastHistoryEntrySchema = new Schema<AdminBroadcastHistoryEntry>(
  {
    action: {
      type: String,
      enum: ['created', 'approved', 'send_started', 'sent', 'failed', 'canceled'],
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      default: null,
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

const AdminBroadcastSchema = new Schema<IAdminBroadcast>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    channel: {
      type: String,
      enum: ['in_app'],
      required: true,
      default: 'in_app',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'sent', 'failed', 'canceled'],
      required: true,
      default: 'draft',
      index: true,
    },
    segment: {
      roles: {
        type: [String],
        enum: ['visitor', 'free', 'premium', 'creator', 'brand_manager', 'admin'],
        default: [],
      },
      accountStatuses: {
        type: [String],
        enum: ['active', 'suspended', 'banned'],
        default: ['active'],
      },
      includeUsers: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        default: [],
      },
      excludeUsers: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        default: [],
      },
      lastActiveWithinDays: {
        type: Number,
        default: null,
        min: 1,
        max: 3650,
      },
    },
    audienceEstimate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    approval: {
      required: {
        type: Boolean,
        required: true,
        default: false,
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
      reason: {
        type: String,
        default: null,
        maxlength: 500,
      },
    },
    delivery: {
      attempted: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      sent: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      failed: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      sentAt: {
        type: Date,
        default: null,
      },
      lastError: {
        type: String,
        default: null,
        maxlength: 500,
      },
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
      type: [AdminBroadcastHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

AdminBroadcastSchema.index({ status: 1, createdAt: -1 })
AdminBroadcastSchema.index({ channel: 1, status: 1, createdAt: -1 })
AdminBroadcastSchema.index({ createdBy: 1, createdAt: -1 })
AdminBroadcastSchema.index({ 'segment.roles': 1, status: 1, createdAt: -1 })
AdminBroadcastSchema.index({ 'approval.required': 1, status: 1, createdAt: -1 })

export const AdminBroadcast = mongoose.model<IAdminBroadcast>('AdminBroadcast', AdminBroadcastSchema)
