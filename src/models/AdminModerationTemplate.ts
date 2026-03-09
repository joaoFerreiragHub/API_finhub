import mongoose, { Document, Schema } from 'mongoose'

export type AdminModerationTemplateHistoryChangeType = 'created' | 'updated' | 'status_change'

export interface AdminModerationTemplateSnapshot {
  label: string
  reason: string
  defaultNote?: string | null
  tags: string[]
  active: boolean
  requiresNote: boolean
  requiresDoubleConfirm: boolean
}

export interface AdminModerationTemplateHistoryEntry {
  version: number
  changeType: AdminModerationTemplateHistoryChangeType
  changedAt: Date
  changedBy?: mongoose.Types.ObjectId | null
  changeReason?: string | null
  snapshot: AdminModerationTemplateSnapshot
}

export interface IAdminModerationTemplate extends Document {
  code: string
  label: string
  reason: string
  defaultNote?: string | null
  tags: string[]
  active: boolean
  requiresNote: boolean
  requiresDoubleConfirm: boolean
  version: number
  createdBy?: mongoose.Types.ObjectId | null
  updatedBy?: mongoose.Types.ObjectId | null
  history: AdminModerationTemplateHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const AdminModerationTemplateHistoryEntrySchema = new Schema<AdminModerationTemplateHistoryEntry>(
  {
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    changeType: {
      type: String,
      enum: ['created', 'updated', 'status_change'],
      required: true,
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changeReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    snapshot: {
      type: {
        label: { type: String, required: true, maxlength: 120 },
        reason: { type: String, required: true, maxlength: 500 },
        defaultNote: { type: String, default: null, maxlength: 2000 },
        tags: { type: [String], default: [] },
        active: { type: Boolean, required: true },
        requiresNote: { type: Boolean, required: true },
        requiresDoubleConfirm: { type: Boolean, required: true },
      },
      required: true,
    },
  },
  {
    _id: false,
  }
)

const AdminModerationTemplateSchema = new Schema<IAdminModerationTemplate>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 64,
      unique: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    defaultNote: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    tags: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    requiresNote: {
      type: Boolean,
      default: false,
    },
    requiresDoubleConfirm: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    history: {
      type: [AdminModerationTemplateHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

AdminModerationTemplateSchema.index({ active: 1, updatedAt: -1 })
AdminModerationTemplateSchema.index({ tags: 1, updatedAt: -1 })

export const AdminModerationTemplate = mongoose.model<IAdminModerationTemplate>(
  'AdminModerationTemplate',
  AdminModerationTemplateSchema
)
