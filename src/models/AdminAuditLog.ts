import mongoose, { Document, Schema } from 'mongoose'
import { AdminScope } from '../admin/permissions'

export type AdminAuditOutcome = 'success' | 'forbidden' | 'error'

export interface IAdminAuditLog extends Document {
  actor: mongoose.Types.ObjectId
  actorRole: string
  action: string
  scope?: AdminScope
  resourceType: string
  resourceId?: string
  reason?: string
  requestId?: string
  method: string
  path: string
  statusCode: number
  outcome: AdminAuditOutcome
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    scope: {
      type: String,
      default: null,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resourceId: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    requestId: {
      type: String,
      default: null,
      index: true,
    },
    method: {
      type: String,
      required: true,
      uppercase: true,
    },
    path: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
      min: 100,
      max: 599,
    },
    outcome: {
      type: String,
      enum: ['success', 'forbidden', 'error'],
      required: true,
      index: true,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
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

AdminAuditLogSchema.index({ createdAt: -1 })
AdminAuditLogSchema.index({ actor: 1, createdAt: -1 })
AdminAuditLogSchema.index({ action: 1, createdAt: -1 })
AdminAuditLogSchema.index({ resourceType: 1, createdAt: -1 })
AdminAuditLogSchema.index({ outcome: 1, createdAt: -1 })

export const AdminAuditLog = mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema)
