import mongoose, { Schema } from 'mongoose'
import { IBaseContent, baseContentSchema, baseContentIndexes } from './BaseContent'
import { slugify, generateUniqueSlug } from '../utils/slugify'

/**
 * Interface específica de Podcast
 */
export interface IPodcast extends IBaseContent {
  audioUrl: string
  duration: number // segundos
  episodeNumber?: number
  season?: number
}

/**
 * Schema de Podcast
 */
const PodcastSchema = new Schema(
  {
    ...baseContentSchema,

    // Campos específicos de Podcast
    audioUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    episodeNumber: {
      type: Number,
      default: null,
    },
    season: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
baseContentIndexes.forEach((index) => {
  PodcastSchema.index(index as any)
})
PodcastSchema.index({ season: 1, episodeNumber: 1 })

// Pre-validate: Gerar slug antes da validação (required: true no schema)
PodcastSchema.pre('validate', async function (this: IPodcast) {
  if (this.isNew || this.isModified('title')) {
    if (!this.slug) {
      const baseSlug = slugify(this.title)
      const checkExists = async (slug: string) => {
        const existing = await Podcast.findOne({ slug })
        return existing !== null
      }
      this.slug = await generateUniqueSlug(baseSlug, checkExists)
    }
  }

  // Garantir contentType
  this.contentType = 'podcast'
})

// Pre-save: Atualizar publishedAt
PodcastSchema.pre('save', function (this: IPodcast, next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  next()
})

export const Podcast = mongoose.model<IPodcast>('Podcast', PodcastSchema)
