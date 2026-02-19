import mongoose, { Schema } from 'mongoose'
import { IBaseContent, baseContentSchema, baseContentIndexes } from './BaseContent'
import { slugify, generateUniqueSlug } from '../utils/slugify'

/**
 * Interface específica de Book
 */
export interface IBook extends IBaseContent {
  author: string
  isbn?: string
  pages: number
  language: string
  publishedDate: Date
  buyLinks?: {
    amazon?: string
    kobo?: string
    other?: string
  }
  keyPhrases: string[]
}

/**
 * Schema de Book
 */
const BookSchema = new Schema(
  {
    ...baseContentSchema,

    // Campos específicos de Book
    author: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      default: null,
    },
    pages: {
      type: Number,
      required: true,
      min: 1,
    },
    language: {
      type: String,
      required: true,
      default: 'pt',
    },
    publishedDate: {
      type: Date,
      required: true,
    },
    buyLinks: {
      amazon: String,
      kobo: String,
      other: String,
    },
    keyPhrases: {
      type: [String],
      default: [],
      validate: {
        validator: function (phrases: string[]) {
          return phrases.length <= 10
        },
        message: 'Máximo de 10 frases-chave permitidas',
      },
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
baseContentIndexes.forEach((index) => {
  BookSchema.index(index as any)
})
BookSchema.index({ author: 1 })
BookSchema.index({ isbn: 1 })

// Pre-validate: Gerar slug antes da validação (required: true no schema)
BookSchema.pre('validate', async function (this: IBook) {
  if (this.isNew || this.isModified('title')) {
    if (!this.slug) {
      const baseSlug = slugify(this.title)
      const checkExists = async (slug: string) => {
        const existing = await Book.findOne({ slug })
        return existing !== null
      }
      this.slug = await generateUniqueSlug(baseSlug, checkExists)
    }
  }

  // Garantir contentType
  this.contentType = 'book'
})

// Pre-save: Atualizar publishedAt
BookSchema.pre('save', function (this: IBook, next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  next()
})

export const Book = mongoose.model<IBook>('Book', BookSchema)
