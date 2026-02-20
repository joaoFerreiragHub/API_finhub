import mongoose, { Document, Schema } from 'mongoose'

export type AssistedSessionAuditOutcome = 'success' | 'forbidden' | 'error'

export interface IAssistedSessionAuditLog extends Document {
  session: mongoose.Types.ObjectId
  adminUser: mongoose.Types.ObjectId
  targetUser: mongoose.Types.ObjectId
  method: string
  path: string
  statusCode: number
  outcome: AssistedSessionAuditOutcome
  requestId?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const AssistedSessionAuditLogSchema = new Schema<IAssistedSessionAuditLog>(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: 'AssistedSession',
      required: true,
      index: true,
    },
    adminUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
      trim: true,
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
    requestId: {
      type: String,
      default: null,
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

AssistedSessionAuditLogSchema.index({ createdAt: -1 })
AssistedSessionAuditLogSchema.index({ session: 1, createdAt: -1 })
AssistedSessionAuditLogSchema.index({ adminUser: 1, createdAt: -1 })
AssistedSessionAuditLogSchema.index({ targetUser: 1, createdAt: -1 })
AssistedSessionAuditLogSchema.index({ outcome: 1, createdAt: -1 })

export const AssistedSessionAuditLog = mongoose.model<IAssistedSessionAuditLog>(
  'AssistedSessionAuditLog',
  AssistedSessionAuditLogSchema
)
