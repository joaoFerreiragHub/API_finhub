import mongoose, { Document, Schema } from 'mongoose'
import { AdType, AdVisibility, AdSlotSurface } from './AdSlotConfig'

export type AdCampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'

export type AdCampaignSponsorType = 'brand' | 'creator' | 'platform'

export interface AdCampaignHistoryEntry {
  changedBy: mongoose.Types.ObjectId
  reason: string
  note?: string | null
  changedAt: Date
  snapshot: {
    status: AdCampaignStatus
    startAt?: Date | null
    endAt?: Date | null
    priority: number
    visibleTo: AdVisibility[]
    slotIds: string[]
  }
}

export interface IAdCampaign extends Document {
  code: string
  title: string
  description?: string | null
  adType: AdType
  sponsorType: AdCampaignSponsorType
  status: AdCampaignStatus
  brand?: mongoose.Types.ObjectId | null
  directoryEntry?: mongoose.Types.ObjectId | null
  surfaces: AdSlotSurface[]
  slotIds: string[]
  visibleTo: AdVisibility[]
  priority: number
  startAt?: Date | null
  endAt?: Date | null
  headline: string
  disclosureLabel?: string | null
  body?: string | null
  ctaText?: string | null
  ctaUrl?: string | null
  imageUrl?: string | null
  relevanceTags: string[]
  estimatedMonthlyBudget?: number | null
  currency: string
  approvedAt?: Date | null
  approvedBy?: mongoose.Types.ObjectId | null
  createdBy: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId | null
  metrics: {
    impressions: number
    clicks: number
    conversions: number
  }
  version: number
  history: AdCampaignHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const AdCampaignHistoryEntrySchema = new Schema<AdCampaignHistoryEntry>(
  {
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    snapshot: {
      status: {
        type: String,
        enum: ['draft', 'pending_approval', 'active', 'paused', 'completed', 'archived'],
        required: true,
      },
      startAt: {
        type: Date,
        default: null,
      },
      endAt: {
        type: Date,
        default: null,
      },
      priority: {
        type: Number,
        required: true,
      },
      visibleTo: {
        type: [String],
        enum: ['free', 'premium', 'all'],
        default: ['all'],
      },
      slotIds: {
        type: [String],
        default: [],
      },
    },
  },
  {
    _id: false,
  }
)

const AdCampaignSchema = new Schema<IAdCampaign>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 60,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    adType: {
      type: String,
      enum: ['external_ads', 'sponsored_ads', 'house_ads', 'value_ads'],
      required: true,
      index: true,
    },
    sponsorType: {
      type: String,
      enum: ['brand', 'creator', 'platform'],
      required: true,
      default: 'brand',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'active', 'paused', 'completed', 'archived'],
      required: true,
      default: 'draft',
      index: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      default: null,
      index: true,
    },
    directoryEntry: {
      type: Schema.Types.ObjectId,
      ref: 'DirectoryEntry',
      default: null,
      index: true,
    },
    surfaces: {
      type: [String],
      enum: ['home_feed', 'tools', 'directory', 'content', 'learning', 'community', 'dashboard', 'profile'],
      required: true,
      default: [],
    },
    slotIds: {
      type: [String],
      default: [],
      index: true,
    },
    visibleTo: {
      type: [String],
      enum: ['free', 'premium', 'all'],
      required: true,
      default: ['all'],
    },
    priority: {
      type: Number,
      required: true,
      default: 100,
      index: true,
    },
    startAt: {
      type: Date,
      default: null,
      index: true,
    },
    endAt: {
      type: Date,
      default: null,
      index: true,
    },
    headline: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    disclosureLabel: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    body: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    ctaText: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    ctaUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1200,
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1200,
    },
    relevanceTags: {
      type: [String],
      default: [],
    },
    estimatedMonthlyBudget: {
      type: Number,
      default: null,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
      maxlength: 8,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metrics: {
      impressions: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      clicks: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      conversions: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
    },
    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    history: {
      type: [AdCampaignHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

AdCampaignSchema.index({ status: 1, adType: 1, priority: 1, updatedAt: -1 })
AdCampaignSchema.index({ status: 1, startAt: 1, endAt: 1 })
AdCampaignSchema.index({ sponsorType: 1, brand: 1, directoryEntry: 1 })
AdCampaignSchema.index({ surfaces: 1, slotIds: 1, status: 1 })

export const AdCampaign = mongoose.model<IAdCampaign>('AdCampaign', AdCampaignSchema)
