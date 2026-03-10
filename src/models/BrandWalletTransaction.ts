import mongoose, { Document, Schema } from 'mongoose'

export type BrandWalletTransactionType =
  | 'top_up'
  | 'campaign_spend'
  | 'refund'
  | 'manual_adjustment'

export type BrandWalletTransactionDirection = 'credit' | 'debit'
export type BrandWalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export interface IBrandWalletTransaction extends Document {
  wallet: mongoose.Types.ObjectId
  directoryEntry: mongoose.Types.ObjectId
  ownerUser: mongoose.Types.ObjectId
  type: BrandWalletTransactionType
  direction: BrandWalletTransactionDirection
  status: BrandWalletTransactionStatus
  amountCents: number
  currency: string
  description?: string | null
  reference?: string | null
  metadata?: Record<string, unknown> | null
  requestedBy?: mongoose.Types.ObjectId | null
  settledAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const BrandWalletTransactionSchema = new Schema<IBrandWalletTransaction>(
  {
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'BrandWallet',
      required: true,
      index: true,
    },
    directoryEntry: {
      type: Schema.Types.ObjectId,
      ref: 'DirectoryEntry',
      required: true,
      index: true,
    },
    ownerUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['top_up', 'campaign_spend', 'refund', 'manual_adjustment'],
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      required: true,
      default: 'pending',
      index: true,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
      maxlength: 8,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      maxlength: 400,
    },
    reference: {
      type: String,
      default: null,
      maxlength: 120,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

BrandWalletTransactionSchema.index({ wallet: 1, createdAt: -1 })
BrandWalletTransactionSchema.index({ directoryEntry: 1, status: 1, createdAt: -1 })
BrandWalletTransactionSchema.index({ ownerUser: 1, status: 1, createdAt: -1 })

export const BrandWalletTransaction = mongoose.model<IBrandWalletTransaction>(
  'BrandWalletTransaction',
  BrandWalletTransactionSchema
)

