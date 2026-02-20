import mongoose, { Document, Schema } from 'mongoose'

export type AssistedSessionScope = 'read_only'

export type AssistedSessionStatus =
  | 'pending'
  | 'approved'
  | 'active'
  | 'declined'
  | 'revoked'
  | 'expired'

export interface IAssistedSession extends Document {
  adminUser: mongoose.Types.ObjectId
  targetUser: mongoose.Types.ObjectId
  scope: AssistedSessionScope
  status: AssistedSessionStatus
  reason: string
  note?: string
  consentExpiresAt: Date
  requestedSessionTtlMinutes: number
  approvedAt?: Date
  startedAt?: Date
  sessionExpiresAt?: Date
  declinedAt?: Date
  declinedReason?: string
  revokedAt?: Date
  revokedBy?: mongoose.Types.ObjectId
  revokedReason?: string
  createdAt: Date
  updatedAt: Date
}

const AssistedSessionSchema = new Schema<IAssistedSession>(
  {
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
    scope: {
      type: String,
      enum: ['read_only'],
      default: 'read_only',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'declined', 'revoked', 'expired'],
      default: 'pending',
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
      maxlength: 2000,
    },
    consentExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    requestedSessionTtlMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 30,
      default: 15,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    sessionExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    declinedAt: {
      type: Date,
      default: null,
    },
    declinedReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revokedReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
)

AssistedSessionSchema.index({ adminUser: 1, createdAt: -1 })
AssistedSessionSchema.index({ targetUser: 1, createdAt: -1 })
AssistedSessionSchema.index({ targetUser: 1, status: 1, createdAt: -1 })
AssistedSessionSchema.index({ adminUser: 1, status: 1, createdAt: -1 })

export const AssistedSession = mongoose.model<IAssistedSession>('AssistedSession', AssistedSessionSchema)
