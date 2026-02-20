import { socialEventBus } from '../events/socialEvents'
import { Article } from '../models/Article'
import { PublishStatus } from '../models/BaseContent'

/**
 * DTOs para Article
 */
export interface CreateArticleDTO {
  title: string
  description: string
  content: string
  category: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface UpdateArticleDTO {
  title?: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface ArticleFilters {
  category?: string
  isPremium?: boolean
  isFeatured?: boolean
  status?: PublishStatus
  creator?: string
  tags?: string[]
  search?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sort?: string
}

/**
 * Service de Articles
 */
export class ArticleService {
  /**
   * Listar artigos (publico)
   */
  async list(filters: ArticleFilters = {}, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = {}
    query.moderationStatus = { $nin: ['hidden', 'restricted'] }

    if (!filters.status) {
      query.status = 'published'
    }

    if (filters.category) {
      query.category = filters.category
    }

    if (filters.isPremium !== undefined) {
      query.isPremium = filters.isPremium
    }

    if (filters.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured
    }

    if (filters.creator) {
      query.creator = filters.creator
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags }
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ]
    }

    let sort: Record<string, 1 | -1> = { publishedAt: -1 }
    if (options.sort === 'popular') {
      sort = { views: -1 }
    } else if (options.sort === 'rating') {
      sort = { averageRating: -1, ratingsCount: -1 }
    } else if (options.sort === 'title') {
      sort = { title: 1 }
    }

    const [articles, total] = await Promise.all([
      Article.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name username avatar')
        .lean(),
      Article.countDocuments(query),
    ])

    return {
      articles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Obter artigo por slug
   */
  async getBySlug(slug: string) {
    const article = await Article.findOne({
      slug,
      moderationStatus: { $nin: ['hidden', 'restricted'] },
    }).populate('creator', 'name username avatar bio')

    if (!article) {
      throw new Error('Artigo nao encontrado')
    }

    return article
  }

  /**
   * Obter artigo por ID
   */
  async getById(id: string) {
    const article = await Article.findById(id).populate('creator', 'name username avatar')

    if (!article) {
      throw new Error('Artigo nao encontrado')
    }

    return article
  }

  /**
   * Criar artigo
   */
  async create(creatorId: string, data: CreateArticleDTO) {
    const article = await Article.create({
      ...data,
      creator: creatorId,
      contentType: 'article',
    })

    if (article.status === 'published') {
      this.emitContentPublishedEvent(creatorId, article.id, article.title)
    }

    return article
  }

  /**
   * Atualizar artigo
   */
  async update(id: string, creatorId: string, data: UpdateArticleDTO) {
    const article = await Article.findById(id)

    if (!article) {
      throw new Error('Artigo nao encontrado')
    }

    if (article.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para editar este artigo')
    }

    const wasPublished = article.status === 'published'
    Object.assign(article, data)
    await article.save()

    if (!wasPublished && article.status === 'published') {
      this.emitContentPublishedEvent(creatorId, article.id, article.title)
    }

    return article
  }

  /**
   * Eliminar artigo
   */
  async delete(id: string, creatorId: string, isAdmin = false) {
    const article = await Article.findById(id)

    if (!article) {
      throw new Error('Artigo nao encontrado')
    }

    if (!isAdmin && article.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para eliminar este artigo')
    }

    await article.deleteOne()

    return { message: 'Artigo eliminado com sucesso' }
  }

  /**
   * Publicar artigo
   */
  async publish(id: string, creatorId: string) {
    const article = await Article.findById(id)

    if (!article) {
      throw new Error('Artigo nao encontrado')
    }

    if (article.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para publicar este artigo')
    }

    const wasPublished = article.status === 'published'
    article.status = 'published'
    article.publishedAt = new Date()
    await article.save()

    if (!wasPublished) {
      this.emitContentPublishedEvent(creatorId, article.id, article.title)
    }

    return article
  }

  /**
   * Incrementar views
   */
  async incrementViews(id: string) {
    await Article.findByIdAndUpdate(id, { $inc: { views: 1 } })
  }

  /**
   * Toggle like
   */
  async toggleLike(id: string, increment: boolean) {
    const update = increment ? { $inc: { likes: 1 } } : { $inc: { likes: -1 } }
    const article = await Article.findByIdAndUpdate(id, update, { new: true })

    if (!article) {
      throw new Error('Artigo nao encontrado')
    }

    return article
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(id: string, increment: boolean) {
    const update = increment ? { $inc: { favorites: 1 } } : { $inc: { favorites: -1 } }
    const article = await Article.findByIdAndUpdate(id, update, { new: true })

    if (!article) {
      throw new Error('Artigo nao encontrado')
    }

    return article
  }

  /**
   * Listar artigos do creator (dashboard)
   */
  async getMyArticles(creatorId: string, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const query = { creator: creatorId }

    let sort: Record<string, 1 | -1> = { createdAt: -1 }
    if (options.sort === 'title') {
      sort = { title: 1 }
    } else if (options.sort === 'views') {
      sort = { views: -1 }
    }

    const [articles, total] = await Promise.all([
      Article.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Article.countDocuments(query),
    ])

    return {
      articles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Estatisticas do creator
   */
  async getStats(creatorId: string) {
    const articles = await Article.find({ creator: creatorId })

    const stats = {
      total: articles.length,
      published: articles.filter((item) => item.status === 'published').length,
      drafts: articles.filter((item) => item.status === 'draft').length,
      totalViews: articles.reduce((sum, item) => sum + item.views, 0),
      totalLikes: articles.reduce((sum, item) => sum + item.likes, 0),
      averageRating: articles.reduce((sum, item) => sum + item.averageRating, 0) / articles.length || 0,
    }

    return stats
  }

  private emitContentPublishedEvent(creatorId: string, contentId: string, title?: string) {
    socialEventBus.publish({
      type: 'social.content.published',
      creatorId,
      contentType: 'article',
      contentId,
      title,
      occurredAt: new Date().toISOString(),
    })
  }
}

export const articleService = new ArticleService()
