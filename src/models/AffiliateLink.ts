import mongoose, { Document, Schema } from 'mongoose'

export interface IAffiliateLink extends Document {
  code: string
  directoryEntry: mongoose.Types.ObjectId
  ownerUser: mongoose.Types.ObjectId
  destinationUrl: string
  label?: string | null
  isActive: boolean
  commissionRateBps?: number | null
  metadata?: Record<string, unknown> | null
  createdBy?: mongoose.Types.ObjectId | null
  updatedBy?: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const AffiliateLinkSchema = new Schema<IAffiliateLink>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 40,
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
    destinationUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    label: {
      type: String,
      default: null,
      trim: true,
      maxlength: 160,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    commissionRateBps: {
      type: Number,
      default: null,
      min: 0,
      max: 10000,
    },
    metadata: {
      type: Schema.Types.Mixed,
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

AffiliateLinkSchema.index({ ownerUser: 1, isActive: 1, updatedAt: -1 })
AffiliateLinkSchema.index({ directoryEntry: 1, isActive: 1, updatedAt: -1 })

export const AffiliateLink = mongoose.model<IAffiliateLink>('AffiliateLink', AffiliateLinkSchema)

