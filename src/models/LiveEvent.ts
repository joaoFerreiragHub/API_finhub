import mongoose, { Schema } from 'mongoose'
import { IBaseContent, baseContentSchema, baseContentIndexes } from './BaseContent'
import { slugify, generateUniqueSlug } from '../utils/slugify'

/**
 * Interface específica de LiveEvent
 */
export interface ILiveEvent extends IBaseContent {
  startDate: Date
  endDate: Date
  streamUrl?: string
  maxAttendees?: number
  attendees: mongoose.Types.ObjectId[] // refs: 'User'
  isRecorded: boolean
  recordingUrl?: string
}

/**
 * Schema de LiveEvent
 */
const LiveEventSchema = new Schema(
  {
    ...baseContentSchema,

    // Campos específicos de LiveEvent
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    streamUrl: {
      type: String,
      default: null,
    },
    maxAttendees: {
      type: Number,
      default: null,
    },
    attendees: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    isRecorded: {
      type: Boolean,
      default: false,
    },
    recordingUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
baseContentIndexes.forEach((index) => {
  LiveEventSchema.index(index as any)
})
LiveEventSchema.index({ startDate: 1 })
LiveEventSchema.index({ endDate: 1 })

// Pre-validate: Gerar slug antes da validação (required: true no schema)
LiveEventSchema.pre('validate', async function (this: ILiveEvent) {
  if (this.isNew || this.isModified('title')) {
    if (!this.slug) {
      const baseSlug = slugify(this.title)
      const checkExists = async (slug: string) => {
        const existing = await LiveEvent.findOne({ slug })
        return existing !== null
      }
      this.slug = await generateUniqueSlug(baseSlug, checkExists)
    }
  }

  // Garantir contentType
  this.contentType = 'live'
})

// Pre-save: Atualizar publishedAt
LiveEventSchema.pre('save', function (this: ILiveEvent, next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  next()
})

// Validação: endDate deve ser após startDate
LiveEventSchema.pre('save', function (this: ILiveEvent, next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('Data de fim deve ser posterior à data de início'))
  }
  next()
})

export const LiveEvent = mongoose.model<ILiveEvent>('LiveEvent', LiveEventSchema)
