import mongoose, { Document, Schema } from 'mongoose'

export const PLATFORM_INTEGRATION_KEYS = [
  'analytics_posthog',
  'analytics_google_analytics',
  'analytics_google_tag_manager',
  'analytics_meta_pixel',
  'captcha_client',
  'seo_defaults',
] as const

export type PlatformIntegrationKey = (typeof PLATFORM_INTEGRATION_KEYS)[number]

export interface IPlatformIntegrationConfigHistoryEntry {
  enabled: boolean
  config: Record<string, unknown>
  reason?: string | null
  note?: string | null
  updatedBy?: mongoose.Types.ObjectId | null
  updatedAt: Date
}

export interface IPlatformIntegrationConfig extends Document {
  key: PlatformIntegrationKey
  enabled: boolean
  config: Record<string, unknown>
  reason?: string | null
  note?: string | null
  updatedBy?: mongoose.Types.ObjectId | null
  history: IPlatformIntegrationConfigHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const PlatformIntegrationConfigHistorySchema = new Schema<IPlatformIntegrationConfigHistoryEntry>(
  {
    enabled: {
      type: Boolean,
      required: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    reason: {
      type: String,
      default: null,
      maxlength: 500,
      trim: true,
    },
    note: {
      type: String,
      default: null,
      maxlength: 2000,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
)

const PlatformIntegrationConfigSchema = new Schema<IPlatformIntegrationConfig>(
  {
    key: {
      type: String,
      enum: PLATFORM_INTEGRATION_KEYS,
      required: true,
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    reason: {
      type: String,
      default: null,
      maxlength: 500,
      trim: true,
    },
    note: {
      type: String,
      default: null,
      maxlength: 2000,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    history: {
      type: [PlatformIntegrationConfigHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

PlatformIntegrationConfigSchema.index({ enabled: 1, updatedAt: -1 })

export const PlatformIntegrationConfig = mongoose.model<IPlatformIntegrationConfig>(
  'PlatformIntegrationConfig',
  PlatformIntegrationConfigSchema
)
