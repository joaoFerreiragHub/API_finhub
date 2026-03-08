import mongoose, { Document, Schema } from 'mongoose'

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled'
export type SubscriptionBillingCycle = 'monthly' | 'annual' | 'lifetime' | 'custom'
export type SubscriptionSource = 'manual_admin' | 'internal' | 'stripe' | 'import'
export type SubscriptionHistoryAction =
  | 'created'
  | 'updated'
  | 'extend_trial'
  | 'revoke_entitlement'
  | 'reactivate'
  | 'status_change'

export interface UserSubscriptionSnapshot {
  planCode: string
  planLabel: string
  billingCycle: SubscriptionBillingCycle
  status: SubscriptionStatus
  entitlementActive: boolean
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  trialEndsAt?: Date | null
  canceledAt?: Date | null
  cancelAtPeriodEnd: boolean
}

export interface UserSubscriptionHistoryEntry {
  version: number
  action: SubscriptionHistoryAction
  reason: string
  note?: string | null
  changedAt: Date
  changedBy?: mongoose.Types.ObjectId | null
  snapshot: UserSubscriptionSnapshot
}

export interface IUserSubscription extends Document {
  user: mongoose.Types.ObjectId
  planCode: string
  planLabel: string
  billingCycle: SubscriptionBillingCycle
  status: SubscriptionStatus
  entitlementActive: boolean
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  trialEndsAt?: Date | null
  canceledAt?: Date | null
  cancelAtPeriodEnd: boolean
  source: SubscriptionSource
  externalSubscriptionId?: string | null
  metadata?: Record<string, unknown> | null
  version: number
  createdBy?: mongoose.Types.ObjectId | null
  updatedBy?: mongoose.Types.ObjectId | null
  history: UserSubscriptionHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const UserSubscriptionSnapshotSchema = new Schema<UserSubscriptionSnapshot>(
  {
    planCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    planLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual', 'lifetime', 'custom'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled'],
      required: true,
    },
    entitlementActive: {
      type: Boolean,
      required: true,
    },
    currentPeriodStart: {
      type: Date,
      default: null,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    canceledAt: {
      type: Date,
      default: null,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
)

const UserSubscriptionHistoryEntrySchema = new Schema<UserSubscriptionHistoryEntry>(
  {
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    action: {
      type: String,
      enum: ['created', 'updated', 'extend_trial', 'revoke_entitlement', 'reactivate', 'status_change'],
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
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    snapshot: {
      type: UserSubscriptionSnapshotSchema,
      required: true,
    },
  },
  { _id: false }
)

const UserSubscriptionSchema = new Schema<IUserSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    planCode: {
      type: String,
      required: true,
      trim: true,
      default: 'premium_monthly',
      maxlength: 80,
    },
    planLabel: {
      type: String,
      required: true,
      trim: true,
      default: 'Premium Monthly',
      maxlength: 120,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual', 'lifetime', 'custom'],
      default: 'monthly',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled'],
      default: 'active',
      required: true,
      index: true,
    },
    entitlementActive: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },
    currentPeriodStart: {
      type: Date,
      default: null,
      index: true,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
      index: true,
    },
    trialEndsAt: {
      type: Date,
      default: null,
      index: true,
    },
    canceledAt: {
      type: Date,
      default: null,
      index: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
      required: true,
    },
    source: {
      type: String,
      enum: ['manual_admin', 'internal', 'stripe', 'import'],
      default: 'internal',
      required: true,
      index: true,
    },
    externalSubscriptionId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
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
      type: [UserSubscriptionHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

UserSubscriptionSchema.index({ user: 1 }, { unique: true })
UserSubscriptionSchema.index({ status: 1, updatedAt: -1 })
UserSubscriptionSchema.index({ planCode: 1, status: 1, updatedAt: -1 })
UserSubscriptionSchema.index({ entitlementActive: 1, status: 1, updatedAt: -1 })
UserSubscriptionSchema.index({ currentPeriodEnd: -1, status: 1 })

export const UserSubscription = mongoose.model<IUserSubscription>(
  'UserSubscription',
  UserSubscriptionSchema
)
