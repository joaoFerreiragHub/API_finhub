import mongoose, { Schema } from 'mongoose'
import { IBaseContent, baseContentSchema, baseContentIndexes } from './BaseContent'
import { slugify, generateUniqueSlug } from '../utils/slugify'

/**
 * Interface específica de Article
 */
export interface IArticle extends IBaseContent {
  readingTime: number // minutos
  wordCount: number
}

/**
 * Schema de Article
 */
const ArticleSchema = new Schema(
  {
    ...baseContentSchema,

    // Campos específicos de Article
    readingTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
baseContentIndexes.forEach((index) => {
  ArticleSchema.index(index as any)
})

// Pre-validate: Gerar slug antes da validação (required: true no schema)
ArticleSchema.pre('validate', async function (this: IArticle) {
  if (this.isNew || this.isModified('title')) {
    if (!this.slug) {
      const baseSlug = slugify(this.title)
      const checkExists = async (slug: string) => {
        const existing = await Article.findOne({ slug })
        return existing !== null
      }
      this.slug = await generateUniqueSlug(baseSlug, checkExists)
    }
  }

  // Garantir contentType
  this.contentType = 'article'
})

// Pre-save: Calcular readingTime e wordCount
ArticleSchema.pre('save', function (this: IArticle, next) {
  if (this.isModified('content')) {
    // Remover HTML tags para contar palavras
    const plainText = this.content.replace(/<[^>]*>/g, '')
    const words = plainText.trim().split(/\s+/)
    this.wordCount = words.length

    // Calcular tempo de leitura (assumir 200 palavras/minuto)
    this.readingTime = Math.ceil(this.wordCount / 200)
  }

  next()
})

// Pre-save: Atualizar publishedAt quando status muda para published
ArticleSchema.pre('save', function (this: IArticle, next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }

  next()
})

export const Article = mongoose.model<IArticle>('Article', ArticleSchema)
