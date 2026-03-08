import mongoose, { Document, Schema } from 'mongoose'
import { ADMIN_SCOPES, AdminScope } from '../admin/permissions'

export type AdminScopeDelegationStatus = 'active' | 'expired' | 'revoked'

export interface IAdminScopeDelegation extends Document {
  delegatedBy: mongoose.Types.ObjectId
  delegatedTo: mongoose.Types.ObjectId
  scope: AdminScope
  reason: string
  note?: string | null
  startsAt: Date
  expiresAt: Date
  revokedAt?: Date | null
  revokedBy?: mongoose.Types.ObjectId | null
  revokeReason?: string | null
  revokeNote?: string | null
  purgeAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const AdminScopeDelegationSchema = new Schema<IAdminScopeDelegation>(
  {
    delegatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    delegatedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ADMIN_SCOPES,
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
    startsAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revokeReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    revokeNote: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    purgeAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

AdminScopeDelegationSchema.index({ delegatedTo: 1, scope: 1, revokedAt: 1, expiresAt: 1 })
AdminScopeDelegationSchema.index({ delegatedTo: 1, createdAt: -1 })
AdminScopeDelegationSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 })

export const AdminScopeDelegation = mongoose.model<IAdminScopeDelegation>(
  'AdminScopeDelegation',
  AdminScopeDelegationSchema
)
