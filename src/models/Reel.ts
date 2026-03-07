import mongoose, { Schema } from 'mongoose'
import { IBaseContent, baseContentSchema, baseContentIndexes } from './BaseContent'
import { generateUniqueSlug, slugify } from '../utils/slugify'

export type ReelOrientation = 'vertical' | 'horizontal'
export type ReelExternalPlatform = 'youtube' | 'tiktok' | 'instagram'

/**
 * Interface especifica de Reel (short-form video)
 */
export interface IReel extends IBaseContent {
  videoUrl: string
  duration: number // segundos
  orientation: ReelOrientation
  externalPlatform?: ReelExternalPlatform | null
  externalId?: string | null
}

/**
 * Schema de Reel
 */
const ReelSchema = new Schema(
  {
    ...baseContentSchema,

    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 90,
    },
    orientation: {
      type: String,
      enum: ['vertical', 'horizontal'],
      default: 'vertical',
    },
    externalPlatform: {
      type: String,
      enum: ['youtube', 'tiktok', 'instagram', null],
      default: null,
    },
    externalId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

baseContentIndexes.forEach((index) => {
  ReelSchema.index(index as any)
})

ReelSchema.pre('validate', async function (this: IReel) {
  if (this.isNew || this.isModified('title')) {
    if (!this.slug) {
      const baseSlug = slugify(this.title)
      const checkExists = async (slug: string) => {
        const existing = await Reel.findOne({ slug })
        return existing !== null
      }
      this.slug = await generateUniqueSlug(baseSlug, checkExists)
    }
  }

  // Mantemos "video" para compatibilidade com camada transversal existente.
  this.contentType = 'video'
})

ReelSchema.pre('save', function (this: IReel, next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  next()
})

export const Reel = mongoose.model<IReel>('Reel', ReelSchema)
