import mongoose, { Document, Schema } from 'mongoose'

export type BrandType =
  | 'broker' // Corretora
  | 'platform' // Plataforma online
  | 'website' // Website interessante
  | 'podcast' // Podcast externo
  | 'tool' // Ferramenta/App
  | 'exchange' // Exchange de crypto
  | 'news-source' // Fonte de notícias
  | 'other'

/**
 * Brand - Entidades inseridas por admins
 * Corretoras, plataformas, websites, podcasts, etc.
 */
export interface IBrand extends Document {
  name: string
  slug: string
  description: string
  brandType: BrandType

  // Media
  logo?: string
  coverImage?: string
  images?: string[]

  // Links
  website?: string
  socialLinks?: {
    twitter?: string
    linkedin?: string
    instagram?: string
    youtube?: string
    facebook?: string
  }

  // Detalhes
  category?: string
  tags: string[]
  country?: string
  founded?: number // Ano de fundação

  // Status
  isActive: boolean
  isFeatured: boolean
  isVerified: boolean

  // Ratings & Comments (calculados)
  averageRating: number
  ratingsCount: number
  commentsCount: number

  // Stats
  views: number

  // Admin
  createdBy: mongoose.Types.ObjectId // ref: 'User' (admin)

  createdAt: Date
  updatedAt: Date
}

const BrandSchema = new Schema<IBrand>(
  {
    name: {
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
      maxlength: 1000,
    },
    brandType: {
      type: String,
      required: true,
      enum: ['broker', 'platform', 'website', 'podcast', 'tool', 'exchange', 'news-source', 'other'],
      index: true,
    },

    // Media
    logo: {
      type: String,
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },

    // Links
    website: {
      type: String,
      default: null,
    },
    socialLinks: {
      twitter: String,
      linkedin: String,
      instagram: String,
      youtube: String,
      facebook: String,
    },

    // Detalhes
    category: {
      type: String,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    country: {
      type: String,
      default: null,
    },
    founded: {
      type: Number,
      default: null,
    },

    // Status
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
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Ratings & Comments
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
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Stats
    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Admin
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
BrandSchema.index({ slug: 1 })
BrandSchema.index({ brandType: 1 })
BrandSchema.index({ isActive: 1 })
BrandSchema.index({ isFeatured: 1 })
BrandSchema.index({ averageRating: -1 })
BrandSchema.index({ createdBy: 1 })

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema)
