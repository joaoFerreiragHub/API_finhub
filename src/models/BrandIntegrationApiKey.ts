import mongoose, { Document, Schema } from 'mongoose'

export const BRAND_INTEGRATION_SCOPES = ['brand.affiliate.read'] as const
export type BrandIntegrationScope = (typeof BRAND_INTEGRATION_SCOPES)[number]

export interface IBrandIntegrationApiKey extends Document {
  keyPrefix: string
  keyHash: string
  ownerUser: mongoose.Types.ObjectId
  directoryEntry: mongoose.Types.ObjectId
  label?: string | null
  scopes: BrandIntegrationScope[]
  isActive: boolean
  lastUsedAt?: Date | null
  expiresAt?: Date | null
  revokedAt?: Date | null
  revokedBy?: mongoose.Types.ObjectId | null
  metadata?: Record<string, unknown> | null
  createdBy?: mongoose.Types.ObjectId | null
  updatedBy?: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const BrandIntegrationApiKeySchema = new Schema<IBrandIntegrationApiKey>(
  {
    keyPrefix: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 60,
      index: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 128,
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
    label: {
      type: String,
      default: null,
      trim: true,
      maxlength: 160,
    },
    scopes: {
      type: [String],
      enum: BRAND_INTEGRATION_SCOPES,
      required: true,
      default: ['brand.affiliate.read'],
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

BrandIntegrationApiKeySchema.index({ ownerUser: 1, isActive: 1, updatedAt: -1 })
BrandIntegrationApiKeySchema.index({ directoryEntry: 1, isActive: 1, updatedAt: -1 })
BrandIntegrationApiKeySchema.index({ expiresAt: 1, isActive: 1 })
BrandIntegrationApiKeySchema.index({ revokedAt: 1, isActive: 1 })

export const BrandIntegrationApiKey = mongoose.model<IBrandIntegrationApiKey>(
  'BrandIntegrationApiKey',
  BrandIntegrationApiKeySchema
)
