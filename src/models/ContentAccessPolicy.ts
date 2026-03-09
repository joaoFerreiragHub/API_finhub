import mongoose, { Document, Schema } from 'mongoose'

export type ContentAccessPolicyContentType =
  | 'article'
  | 'video'
  | 'course'
  | 'live'
  | 'podcast'
  | 'book'

export type ContentAccessPolicyCategory =
  | 'finance'
  | 'investing'
  | 'trading'
  | 'crypto'
  | 'economics'
  | 'personal-finance'
  | 'business'
  | 'technology'
  | 'education'
  | 'news'
  | 'analysis'
  | 'other'

export type ContentAccessPolicyRequiredRole = 'free' | 'premium'
export type ContentAccessPolicyHistoryChangeType = 'created' | 'updated' | 'status_change'

export interface ContentAccessPolicyMatch {
  contentTypes: ContentAccessPolicyContentType[]
  categories: ContentAccessPolicyCategory[]
  tags: string[]
  featuredOnly: boolean
}

export interface ContentAccessPolicyAccess {
  requiredRole: ContentAccessPolicyRequiredRole
  teaserAllowed: boolean
  blockedMessage?: string | null
}

export interface ContentAccessPolicySnapshot {
  label: string
  description?: string | null
  active: boolean
  priority: number
  effectiveFrom?: Date | null
  effectiveTo?: Date | null
  match: ContentAccessPolicyMatch
  access: ContentAccessPolicyAccess
}

export interface ContentAccessPolicyHistoryEntry {
  version: number
  changeType: ContentAccessPolicyHistoryChangeType
  changedAt: Date
  changedBy?: mongoose.Types.ObjectId | null
  changeReason?: string | null
  snapshot: ContentAccessPolicySnapshot
}

export interface IContentAccessPolicy extends Document {
  code: string
  label: string
  description?: string | null
  active: boolean
  priority: number
  effectiveFrom?: Date | null
  effectiveTo?: Date | null
  match: ContentAccessPolicyMatch
  access: ContentAccessPolicyAccess
  version: number
  createdBy?: mongoose.Types.ObjectId | null
  updatedBy?: mongoose.Types.ObjectId | null
  history: ContentAccessPolicyHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const CONTENT_TYPES: ContentAccessPolicyContentType[] = [
  'article',
  'video',
  'course',
  'live',
  'podcast',
  'book',
]

const CATEGORIES: ContentAccessPolicyCategory[] = [
  'finance',
  'investing',
  'trading',
  'crypto',
  'economics',
  'personal-finance',
  'business',
  'technology',
  'education',
  'news',
  'analysis',
  'other',
]

const ContentAccessPolicyMatchSchema = new Schema<ContentAccessPolicyMatch>(
  {
    contentTypes: {
      type: [String],
      enum: CONTENT_TYPES,
      required: true,
      default: CONTENT_TYPES,
    },
    categories: {
      type: [String],
      enum: CATEGORIES,
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    featuredOnly: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
)

const ContentAccessPolicyAccessSchema = new Schema<ContentAccessPolicyAccess>(
  {
    requiredRole: {
      type: String,
      enum: ['free', 'premium'],
      required: true,
      default: 'premium',
    },
    teaserAllowed: {
      type: Boolean,
      required: true,
      default: true,
    },
    blockedMessage: {
      type: String,
      default: null,
      maxlength: 300,
    },
  },
  {
    _id: false,
  }
)

const ContentAccessPolicySnapshotSchema = new Schema<ContentAccessPolicySnapshot>(
  {
    label: {
      type: String,
      required: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: null,
      maxlength: 500,
    },
    active: {
      type: Boolean,
      required: true,
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },
    effectiveFrom: {
      type: Date,
      default: null,
    },
    effectiveTo: {
      type: Date,
      default: null,
    },
    match: {
      type: ContentAccessPolicyMatchSchema,
      required: true,
    },
    access: {
      type: ContentAccessPolicyAccessSchema,
      required: true,
    },
  },
  {
    _id: false,
  }
)

const ContentAccessPolicyHistoryEntrySchema = new Schema<ContentAccessPolicyHistoryEntry>(
  {
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    changeType: {
      type: String,
      enum: ['created', 'updated', 'status_change'],
      required: true,
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changeReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    snapshot: {
      type: ContentAccessPolicySnapshotSchema,
      required: true,
    },
  },
  {
    _id: false,
  }
)

const ContentAccessPolicySchema = new Schema<IContentAccessPolicy>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 64,
      unique: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: null,
      maxlength: 500,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
      default: 100,
    },
    effectiveFrom: {
      type: Date,
      default: null,
      index: true,
    },
    effectiveTo: {
      type: Date,
      default: null,
      index: true,
    },
    match: {
      type: ContentAccessPolicyMatchSchema,
      required: true,
      default: () => ({
        contentTypes: CONTENT_TYPES,
        categories: [],
        tags: [],
        featuredOnly: false,
      }),
    },
    access: {
      type: ContentAccessPolicyAccessSchema,
      required: true,
      default: () => ({
        requiredRole: 'premium',
        teaserAllowed: true,
        blockedMessage: null,
      }),
    },
    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
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
    history: {
      type: [ContentAccessPolicyHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

ContentAccessPolicySchema.index({ active: 1, priority: -1, updatedAt: -1 })
ContentAccessPolicySchema.index({ 'access.requiredRole': 1, active: 1, priority: -1 })
ContentAccessPolicySchema.index({ 'match.contentTypes': 1, active: 1, priority: -1 })
ContentAccessPolicySchema.index({ 'match.categories': 1, active: 1, priority: -1 })

export const ContentAccessPolicy = mongoose.model<IContentAccessPolicy>(
  'ContentAccessPolicy',
  ContentAccessPolicySchema
)
