import mongoose, { Document, Schema } from 'mongoose'
import { BrandIntegrationScope, BRAND_INTEGRATION_SCOPES } from './BrandIntegrationApiKey'

export interface IBrandIntegrationApiUsage extends Document {
  apiKey: mongoose.Types.ObjectId
  keyPrefix: string
  ownerUser: mongoose.Types.ObjectId
  directoryEntry: mongoose.Types.ObjectId
  scope: BrandIntegrationScope
  method: string
  path: string
  statusCode: number
  durationMs: number
  requestId?: string | null
  ipHash?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const BrandIntegrationApiUsageSchema = new Schema<IBrandIntegrationApiUsage>(
  {
    apiKey: {
      type: Schema.Types.ObjectId,
      ref: 'BrandIntegrationApiKey',
      required: true,
      index: true,
    },
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      index: true,
    },
    ownerUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    directoryEntry: {
      type: Schema.Types.ObjectId,
      ref: 'DirectoryEntry',
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: BRAND_INTEGRATION_SCOPES,
      required: true,
      index: true,
    },
    method: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 10,
      index: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
      index: true,
    },
    statusCode: {
      type: Number,
      required: true,
      min: 100,
      max: 599,
      index: true,
    },
    durationMs: {
      type: Number,
      required: true,
      min: 0,
      max: 600000,
    },
    requestId: {
      type: String,
      default: null,
      maxlength: 120,
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
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
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

BrandIntegrationApiUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
BrandIntegrationApiUsageSchema.index({ apiKey: 1, createdAt: -1 })
BrandIntegrationApiUsageSchema.index({ ownerUser: 1, createdAt: -1 })
BrandIntegrationApiUsageSchema.index({ directoryEntry: 1, createdAt: -1 })

export const BrandIntegrationApiUsage = mongoose.model<IBrandIntegrationApiUsage>(
  'BrandIntegrationApiUsage',
  BrandIntegrationApiUsageSchema
)
