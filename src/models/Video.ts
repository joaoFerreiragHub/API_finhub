import mongoose, { Schema } from 'mongoose'
import { IBaseContent, baseContentSchema, baseContentIndexes } from './BaseContent'
import { slugify, generateUniqueSlug } from '../utils/slugify'

export type VideoQuality = '720p' | '1080p' | '4k'

/**
 * Interface específica de Video
 */
export interface IVideo extends IBaseContent {
  videoUrl: string
  duration: number // segundos
  quality: VideoQuality
}

/**
 * Schema de Video
 */
const VideoSchema = new Schema(
  {
    ...baseContentSchema,

    // Campos específicos de Video
    videoUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    quality: {
      type: String,
      enum: ['720p', '1080p', '4k'],
      default: '1080p',
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
baseContentIndexes.forEach((index) => {
  VideoSchema.index(index as any)
})

// Pre-validate: Gerar slug antes da validação (required: true no schema)
VideoSchema.pre('validate', async function (this: IVideo) {
  if (this.isNew || this.isModified('title')) {
    if (!this.slug) {
      const baseSlug = slugify(this.title)
      const checkExists = async (slug: string) => {
        const existing = await Video.findOne({ slug })
        return existing !== null
      }
      this.slug = await generateUniqueSlug(baseSlug, checkExists)
    }
  }

  // Garantir contentType
  this.contentType = 'video'
})

// Pre-save: Atualizar publishedAt
VideoSchema.pre('save', function (this: IVideo, next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  next()
})

export const Video = mongoose.model<IVideo>('Video', VideoSchema)
