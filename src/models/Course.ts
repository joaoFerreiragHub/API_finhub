import mongoose, { Schema } from 'mongoose'
import { IBaseContent, baseContentSchema, baseContentIndexes } from './BaseContent'
import { slugify, generateUniqueSlug } from '../utils/slugify'

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

export interface CourseLesson {
  title: string
  duration: number // minutos
  videoUrl?: string
  isFree: boolean // Aula gratuita (preview)
  order: number
}

/**
 * Interface específica de Course
 */
export interface ICourse extends IBaseContent {
  price: number
  level: CourseLevel
  duration: number // horas totais
  lessonsCount: number
  lessons: CourseLesson[]
}

/**
 * Schema de Course
 */
const CourseSchema = new Schema(
  {
    ...baseContentSchema,

    // Campos específicos de Course
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    level: {
      type: String,
      required: true,
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    lessonsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lessons: [
      {
        title: { type: String, required: true },
        duration: { type: Number, required: true },
        videoUrl: String,
        isFree: { type: Boolean, default: false },
        order: { type: Number, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
)

// Indexes
baseContentIndexes.forEach((index) => {
  CourseSchema.index(index as any)
})
CourseSchema.index({ price: 1 })
CourseSchema.index({ level: 1 })

// Pre-validate: Gerar slug antes da validação (required: true no schema)
CourseSchema.pre('validate', async function (this: ICourse) {
  if (this.isNew || this.isModified('title')) {
    if (!this.slug) {
      const baseSlug = slugify(this.title)
      const checkExists = async (slug: string) => {
        const existing = await Course.findOne({ slug })
        return existing !== null
      }
      this.slug = await generateUniqueSlug(baseSlug, checkExists)
    }
  }

  // Garantir contentType
  this.contentType = 'course'
})

// Pre-save: Atualizar lessonsCount
CourseSchema.pre('save', function (this: ICourse, next) {
  if (this.isModified('lessons')) {
    this.lessonsCount = this.lessons.length
  }
  next()
})

// Pre-save: Atualizar publishedAt
CourseSchema.pre('save', function (this: ICourse, next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  next()
})

export const Course = mongoose.model<ICourse>('Course', CourseSchema)
