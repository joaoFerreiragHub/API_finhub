import mongoose, { Document, Schema } from 'mongoose'

export type AdType = 'external_ads' | 'sponsored_ads' | 'house_ads' | 'value_ads'
export type AdVisibility = 'free' | 'premium' | 'all'
export type AdSlotSurface =
  | 'home_feed'
  | 'tools'
  | 'directory'
  | 'content'
  | 'learning'
  | 'community'
  | 'dashboard'
  | 'profile'
export type AdSlotPosition =
  | 'sidebar'
  | 'inline'
  | 'footer'
  | 'header'
  | 'banner'
  | 'card'
  | 'comparison_strip'
export type AdSlotDevice = 'all' | 'desktop' | 'mobile'

export interface AdSlotHistoryEntry {
  changedBy: mongoose.Types.ObjectId
  reason: string
  note?: string | null
  changedAt: Date
  snapshot: {
    allowedTypes: AdType[]
    visibleTo: AdVisibility[]
    maxPerSession: number
    minSecondsBetweenImpressions: number
    isActive: boolean
    priority: number
    fallbackType?: AdType | null
  }
}

export interface IAdSlotConfig extends Document {
  slotId: string
  label: string
  surface: AdSlotSurface
  position: AdSlotPosition
  device: AdSlotDevice
  allowedTypes: AdType[]
  visibleTo: AdVisibility[]
  maxPerSession: number
  minSecondsBetweenImpressions: number
  minContentBefore: number
  isActive: boolean
  priority: number
  fallbackType?: AdType | null
  notes?: string | null
  createdBy: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId | null
  version: number
  history: AdSlotHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const AdSlotHistoryEntrySchema = new Schema<AdSlotHistoryEntry>(
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
      allowedTypes: {
        type: [String],
        enum: ['external_ads', 'sponsored_ads', 'house_ads', 'value_ads'],
        default: [],
      },
      visibleTo: {
        type: [String],
        enum: ['free', 'premium', 'all'],
        default: ['all'],
      },
      maxPerSession: {
        type: Number,
        required: true,
        min: 0,
      },
      minSecondsBetweenImpressions: {
        type: Number,
        required: true,
        min: 0,
      },
      isActive: {
        type: Boolean,
        required: true,
      },
      priority: {
        type: Number,
        required: true,
      },
      fallbackType: {
        type: String,
        enum: ['external_ads', 'sponsored_ads', 'house_ads', 'value_ads'],
        default: null,
      },
    },
  },
  {
    _id: false,
  }
)

const AdSlotConfigSchema = new Schema<IAdSlotConfig>(
  {
    slotId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
      unique: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    surface: {
      type: String,
      enum: ['home_feed', 'tools', 'directory', 'content', 'learning', 'community', 'dashboard', 'profile'],
      required: true,
      index: true,
    },
    position: {
      type: String,
      enum: ['sidebar', 'inline', 'footer', 'header', 'banner', 'card', 'comparison_strip'],
      required: true,
      index: true,
    },
    device: {
      type: String,
      enum: ['all', 'desktop', 'mobile'],
      required: true,
      default: 'all',
      index: true,
    },
    allowedTypes: {
      type: [String],
      enum: ['external_ads', 'sponsored_ads', 'house_ads', 'value_ads'],
      required: true,
      default: [],
    },
    visibleTo: {
      type: [String],
      enum: ['free', 'premium', 'all'],
      required: true,
      default: ['all'],
    },
    maxPerSession: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    minSecondsBetweenImpressions: {
      type: Number,
      required: true,
      min: 0,
      default: 120,
    },
    minContentBefore: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      required: true,
      default: 100,
      index: true,
    },
    fallbackType: {
      type: String,
      enum: ['external_ads', 'sponsored_ads', 'house_ads', 'value_ads'],
      default: null,
    },
    notes: {
      type: String,
      default: null,
      maxlength: 2000,
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
    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    history: {
      type: [AdSlotHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

AdSlotConfigSchema.index({ surface: 1, isActive: 1, priority: 1 })
AdSlotConfigSchema.index({ surface: 1, position: 1, device: 1, isActive: 1 })
AdSlotConfigSchema.index({ allowedTypes: 1, visibleTo: 1, isActive: 1 })

export const AdSlotConfig = mongoose.model<IAdSlotConfig>('AdSlotConfig', AdSlotConfigSchema)
