import mongoose, { Document, Schema } from 'mongoose'
import { AdSlotSurface } from './AdSlotConfig'

export type AdDeliveryAudience = 'free' | 'premium'
export type AdDeliveryDevice = 'desktop' | 'mobile' | 'all'

export interface IAdDeliveryEvent extends Document {
  tokenHash: string
  campaign: mongoose.Types.ObjectId
  slotId: string
  surface: AdSlotSurface
  sessionKey: string
  audience: AdDeliveryAudience
  device: AdDeliveryDevice
  country?: string | null
  vertical?: string | null
  servedAt: Date
  impressionAt?: Date | null
  clickAt?: Date | null
  impressionCount: number
  clickCount: number
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const AdDeliveryEventSchema = new Schema<IAdDeliveryEvent>(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 128,
    },
    campaign: {
      type: Schema.Types.ObjectId,
      ref: 'AdCampaign',
      required: true,
      index: true,
    },
    slotId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 40,
      index: true,
    },
    surface: {
      type: String,
      enum: ['home_feed', 'tools', 'directory', 'content', 'learning', 'community', 'dashboard', 'profile'],
      required: true,
      index: true,
    },
    sessionKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    audience: {
      type: String,
      enum: ['free', 'premium'],
      required: true,
      default: 'free',
      index: true,
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'all'],
      required: true,
      default: 'all',
      index: true,
    },
    country: {
      type: String,
      default: null,
      trim: true,
      maxlength: 12,
    },
    vertical: {
      type: String,
      default: null,
      trim: true,
      maxlength: 40,
    },
    servedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    impressionAt: {
      type: Date,
      default: null,
      index: true,
    },
    clickAt: {
      type: Date,
      default: null,
      index: true,
    },
    impressionCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    clickCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

AdDeliveryEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
AdDeliveryEventSchema.index({ slotId: 1, sessionKey: 1, servedAt: -1 })
AdDeliveryEventSchema.index({ campaign: 1, servedAt: -1 })

export const AdDeliveryEvent = mongoose.model<IAdDeliveryEvent>('AdDeliveryEvent', AdDeliveryEventSchema)

