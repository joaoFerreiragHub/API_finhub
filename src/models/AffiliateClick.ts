import mongoose, { Document, Schema } from 'mongoose'

export interface IAffiliateClick extends Document {
  link: mongoose.Types.ObjectId
  code: string
  directoryEntry: mongoose.Types.ObjectId
  ownerUser: mongoose.Types.ObjectId
  visitorUser?: mongoose.Types.ObjectId | null
  ipHash?: string | null
  userAgent?: string | null
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
  clickedAt: Date
  converted: boolean
  convertedAt?: Date | null
  conversionValueCents?: number | null
  conversionCurrency?: string | null
  conversionReference?: string | null
  convertedBy?: mongoose.Types.ObjectId | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

const AffiliateClickSchema = new Schema<IAffiliateClick>(
  {
    link: {
      type: Schema.Types.ObjectId,
      ref: 'AffiliateLink',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
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
    visitorUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    ipHash: {
      type: String,
      default: null,
      maxlength: 128,
      index: true,
    },
    userAgent: {
      type: String,
      default: null,
      maxlength: 800,
    },
    referrer: {
      type: String,
      default: null,
      maxlength: 1200,
    },
    utmSource: {
      type: String,
      default: null,
      maxlength: 120,
    },
    utmMedium: {
      type: String,
      default: null,
      maxlength: 120,
    },
    utmCampaign: {
      type: String,
      default: null,
      maxlength: 160,
    },
    utmTerm: {
      type: String,
      default: null,
      maxlength: 160,
    },
    utmContent: {
      type: String,
      default: null,
      maxlength: 160,
    },
    clickedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    converted: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    convertedAt: {
      type: Date,
      default: null,
      index: true,
    },
    conversionValueCents: {
      type: Number,
      default: null,
      min: 0,
    },
    conversionCurrency: {
      type: String,
      default: null,
      trim: true,
      maxlength: 8,
    },
    conversionReference: {
      type: String,
      default: null,
      trim: true,
      maxlength: 160,
      index: true,
    },
    convertedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

AffiliateClickSchema.index({ link: 1, clickedAt: -1 })
AffiliateClickSchema.index({ directoryEntry: 1, clickedAt: -1 })
AffiliateClickSchema.index({ ownerUser: 1, clickedAt: -1 })
AffiliateClickSchema.index({ converted: 1, clickedAt: -1 })
AffiliateClickSchema.index({ code: 1, clickedAt: -1 })

export const AffiliateClick = mongoose.model<IAffiliateClick>('AffiliateClick', AffiliateClickSchema)
