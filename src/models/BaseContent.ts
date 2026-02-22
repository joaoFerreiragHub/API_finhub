import mongoose, { Document, Schema } from 'mongoose'

export type ContentType = 'article' | 'video' | 'course' | 'live' | 'podcast' | 'book'
export type ContentModerationStatus = 'visible' | 'hidden' | 'restricted'
export type ContentCategory =
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
export type PublishStatus = 'draft' | 'published' | 'archived'
export type ContentOwnerType = 'admin_seeded' | 'creator_owned'
export type ContentSourceType = 'internal' | 'external_profile' | 'external_content'

/**
 * Interface base para todos os tipos de conteúdo
 */
export interface IBaseContent extends Document {
  title: string
  slug: string
  description: string
  content: string // HTML/Markdown
  contentType: ContentType

  // Categorização
  category: ContentCategory
  tags: string[]

  // Media
  coverImage?: string
  thumbnail?: string

  // Permissions
  isPremium: boolean
  isFeatured: boolean

  // Status
  status: PublishStatus
  publishedAt?: Date
  moderationStatus: ContentModerationStatus
  moderationReason?: string
  moderationNote?: string
  moderatedBy?: mongoose.Types.ObjectId
  moderatedAt?: Date
  ownerType: ContentOwnerType
  sourceType: ContentSourceType
  claimable: boolean
  editorialVisibility: {
    showOnHome: boolean
    showOnLanding: boolean
    showOnShowAll: boolean
  }

  // Creator
  creator: mongoose.Types.ObjectId // ref: 'User'

  // Engagement
  views: number
  likes: number
  favorites: number
  commentsCount: number

  // Ratings
  averageRating: number
  ratingsCount: number

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

/**
 * Schema base para conteúdos
 * Usado como base para Article, Video, Course, etc.
 */
export const baseContentSchema = {
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  content: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
    enum: ['article', 'video', 'course', 'live', 'podcast', 'book'],
  },

  // Categorização
  category: {
    type: String,
    required: true,
    enum: [
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
    ],
    index: true,
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function (tags: string[]) {
        return tags.length <= 10
      },
      message: 'Máximo de 10 tags permitidas',
    },
  },

  // Media
  coverImage: {
    type: String,
    default: null,
  },
  thumbnail: {
    type: String,
    default: null,
  },

  // Permissions
  isPremium: {
    type: Boolean,
    default: false,
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true,
  },
  publishedAt: {
    type: Date,
    default: null,
  },
  moderationStatus: {
    type: String,
    enum: ['visible', 'hidden', 'restricted'],
    default: 'visible',
    index: true,
  },
  moderationReason: {
    type: String,
    default: null,
    maxlength: 500,
  },
  moderationNote: {
    type: String,
    default: null,
    maxlength: 2000,
  },
  moderatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  moderatedAt: {
    type: Date,
    default: null,
  },
  ownerType: {
    type: String,
    enum: ['admin_seeded', 'creator_owned'],
    default: 'creator_owned',
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
    default: false,
    index: true,
  },
  editorialVisibility: {
    showOnHome: {
      type: Boolean,
      default: false,
    },
    showOnLanding: {
      type: Boolean,
      default: true,
    },
    showOnShowAll: {
      type: Boolean,
      default: true,
    },
  },

  // Creator
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Engagement
  views: {
    type: Number,
    default: 0,
    min: 0,
  },
  likes: {
    type: Number,
    default: 0,
    min: 0,
  },
  favorites: {
    type: Number,
    default: 0,
    min: 0,
  },
  commentsCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Ratings
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  ratingsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
}

/**
 * Indexes comuns para todos os conteúdos
 */
export const baseContentIndexes = [
  { slug: 1 },
  { creator: 1 },
  { status: 1 },
  { category: 1 },
  { isPremium: 1 },
  { isFeatured: 1 },
  { publishedAt: -1 },
  { moderationStatus: 1, updatedAt: -1 },
  { moderatedAt: -1 },
  { ownerType: 1 },
  { sourceType: 1 },
  { claimable: 1 },
  { 'editorialVisibility.showOnHome': 1 },
  { 'editorialVisibility.showOnLanding': 1 },
  { 'editorialVisibility.showOnShowAll': 1 },
  { averageRating: -1 },
  { views: -1 },
]
