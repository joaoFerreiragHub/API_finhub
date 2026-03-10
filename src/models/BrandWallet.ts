import mongoose, { Document, Schema } from 'mongoose'

export interface IBrandWallet extends Document {
  directoryEntry: mongoose.Types.ObjectId
  ownerUser: mongoose.Types.ObjectId
  currency: string
  balanceCents: number
  reservedCents: number
  lifetimeCreditsCents: number
  lifetimeDebitsCents: number
  lastTransactionAt?: Date | null
  createdBy?: mongoose.Types.ObjectId | null
  updatedBy?: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const BrandWalletSchema = new Schema<IBrandWallet>(
  {
    directoryEntry: {
      type: Schema.Types.ObjectId,
      ref: 'DirectoryEntry',
      required: true,
      unique: true,
      index: true,
    },
    ownerUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
      maxlength: 8,
      trim: true,
    },
    balanceCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reservedCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lifetimeCreditsCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lifetimeDebitsCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastTransactionAt: {
      type: Date,
      default: null,
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
  },
  {
    timestamps: true,
  }
)

BrandWalletSchema.index({ ownerUser: 1, updatedAt: -1 })
BrandWalletSchema.index({ balanceCents: -1, updatedAt: -1 })

export const BrandWallet = mongoose.model<IBrandWallet>('BrandWallet', BrandWalletSchema)

