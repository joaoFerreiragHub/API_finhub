import mongoose, { Document, Schema } from 'mongoose'

export type DirectoryVerticalType =
  | 'broker'
  | 'exchange'
  | 'site'
  | 'app'
  | 'podcast'
  | 'event'
  | 'other'

export type DirectoryEntryStatus = 'draft' | 'published' | 'archived'
export type DirectoryVerificationStatus = 'unverified' | 'pending' | 'verified'
export type DirectoryOwnerType = 'admin_seeded' | 'creator_owned'
export type DirectorySourceType = 'internal' | 'external_profile' | 'external_content'

export interface IDirectoryEntry extends Document {
  name: string
  slug: string
  verticalType: DirectoryVerticalType
  shortDescription: string
  description?: string | null
  logo?: string | null
  coverImage?: string | null
  website?: string | null
  canonicalUrl?: string | null
  country?: string | null
  region?: string | null
  categories: string[]
  tags: string[]
  socialLinks?: {
    twitter?: string
    linkedin?: string
    instagram?: string
    youtube?: string
    facebook?: string
    tiktok?: string
  }
  status: DirectoryEntryStatus
  verificationStatus: DirectoryVerificationStatus
  isActive: boolean
  isFeatured: boolean
  showInHomeSection: boolean
  showInDirectory: boolean
  landingEnabled: boolean
  showAllEnabled: boolean
  ownerType: DirectoryOwnerType
  sourceType: DirectorySourceType
  claimable: boolean
  ownerUser?: mongoose.Types.ObjectId | null
  publishedAt?: Date | null
  archivedAt?: Date | null
  metadata?: Record<string, unknown> | null
  createdBy: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const DirectoryEntrySchema = new Schema<IDirectoryEntry>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 180,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
      index: true,
    },
    verticalType: {
      type: String,
      required: true,
      enum: ['broker', 'exchange', 'site', 'app', 'podcast', 'event', 'other'],
      index: true,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280,
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: 4000,
    },
    logo: {
      type: String,
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
    website: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1200,
    },
    canonicalUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1200,
    },
    country: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
      index: true,
    },
    region: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
      index: true,
    },
    categories: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    socialLinks: {
      twitter: { type: String, default: null },
      linkedin: { type: String, default: null },
      instagram: { type: String, default: null },
      youtube: { type: String, default: null },
      facebook: { type: String, default: null },
      tiktok: { type: String, default: null },
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified'],
      default: 'unverified',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    showInHomeSection: {
      type: Boolean,
      default: false,
      index: true,
    },
    showInDirectory: {
      type: Boolean,
      default: true,
      index: true,
    },
    landingEnabled: {
      type: Boolean,
      default: true,
    },
    showAllEnabled: {
      type: Boolean,
      default: true,
    },
    ownerType: {
      type: String,
      enum: ['admin_seeded', 'creator_owned'],
      default: 'admin_seeded',
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['internal', 'external_profile', 'external_content'],
      default: 'internal',
      index: true,
    },
    claimable: {
      type: Boolean,
      default: true,
      index: true,
    },
    ownerUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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

DirectoryEntrySchema.index({ verticalType: 1, status: 1, isActive: 1, updatedAt: -1 })
DirectoryEntrySchema.index({ verticalType: 1, showInDirectory: 1, isFeatured: -1, updatedAt: -1 })
DirectoryEntrySchema.index({ ownerType: 1, claimable: 1 })
DirectoryEntrySchema.index({ canonicalUrl: 1 }, { sparse: true })

export const DirectoryEntry = mongoose.model<IDirectoryEntry>('DirectoryEntry', DirectoryEntrySchema)
