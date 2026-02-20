import { socialEventBus } from '../events/socialEvents'
import { PublishStatus } from '../models/BaseContent'
import { Podcast } from '../models/Podcast'

/**
 * DTOs para Podcast
 */
export interface CreatePodcastDTO {
  title: string
  description: string
  content: string
  category: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface UpdatePodcastDTO {
  title?: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface PodcastFilters {
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
 * Service de Podcasts
 */
export class PodcastService {
  /**
   * Listar podcasts (publico)
   */
  async list(filters: PodcastFilters = {}, options: PaginationOptions = {}) {
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

    const [podcasts, total] = await Promise.all([
      Podcast.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name username avatar')
        .lean(),
      Podcast.countDocuments(query),
    ])

    return {
      podcasts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Obter podcast por slug
   */
  async getBySlug(slug: string) {
    const podcast = await Podcast.findOne({
      slug,
      moderationStatus: { $nin: ['hidden', 'restricted'] },
    }).populate('creator', 'name username avatar bio')

    if (!podcast) {
      throw new Error('Podcast nao encontrado')
    }

    return podcast
  }

  /**
   * Obter podcast por ID
   */
  async getById(id: string) {
    const podcast = await Podcast.findById(id).populate('creator', 'name username avatar')

    if (!podcast) {
      throw new Error('Podcast nao encontrado')
    }

    return podcast
  }

  /**
   * Criar podcast
   */
  async create(creatorId: string, data: CreatePodcastDTO) {
    const podcast = await Podcast.create({
      ...data,
      creator: creatorId,
      contentType: 'podcast',
    })

    if (podcast.status === 'published') {
      this.emitContentPublishedEvent(creatorId, podcast.id, podcast.title)
    }

    return podcast
  }

  /**
   * Atualizar podcast
   */
  async update(id: string, creatorId: string, data: UpdatePodcastDTO) {
    const podcast = await Podcast.findById(id)

    if (!podcast) {
      throw new Error('Podcast nao encontrado')
    }

    if (podcast.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para editar este podcast')
    }

    const wasPublished = podcast.status === 'published'
    Object.assign(podcast, data)
    await podcast.save()

    if (!wasPublished && podcast.status === 'published') {
      this.emitContentPublishedEvent(creatorId, podcast.id, podcast.title)
    }

    return podcast
  }

  /**
   * Eliminar podcast
   */
  async delete(id: string, creatorId: string, isAdmin = false) {
    const podcast = await Podcast.findById(id)

    if (!podcast) {
      throw new Error('Podcast nao encontrado')
    }

    if (!isAdmin && podcast.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para eliminar este podcast')
    }

    await podcast.deleteOne()

    return { message: 'Podcast eliminado com sucesso' }
  }

  /**
   * Publicar podcast
   */
  async publish(id: string, creatorId: string) {
    const podcast = await Podcast.findById(id)

    if (!podcast) {
      throw new Error('Podcast nao encontrado')
    }

    if (podcast.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para publicar este podcast')
    }

    const wasPublished = podcast.status === 'published'
    podcast.status = 'published'
    podcast.publishedAt = new Date()
    await podcast.save()

    if (!wasPublished) {
      this.emitContentPublishedEvent(creatorId, podcast.id, podcast.title)
    }

    return podcast
  }

  /**
   * Incrementar views
   */
  async incrementViews(id: string) {
    await Podcast.findByIdAndUpdate(id, { $inc: { views: 1 } })
  }

  /**
   * Toggle like
   */
  async toggleLike(id: string, increment: boolean) {
    const update = increment ? { $inc: { likes: 1 } } : { $inc: { likes: -1 } }
    const podcast = await Podcast.findByIdAndUpdate(id, update, { new: true })

    if (!podcast) {
      throw new Error('Podcast nao encontrado')
    }

    return podcast
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(id: string, increment: boolean) {
    const update = increment ? { $inc: { favorites: 1 } } : { $inc: { favorites: -1 } }
    const podcast = await Podcast.findByIdAndUpdate(id, update, { new: true })

    if (!podcast) {
      throw new Error('Podcast nao encontrado')
    }

    return podcast
  }

  /**
   * Listar podcasts do creator (dashboard)
   */
  async getMyPodcasts(creatorId: string, options: PaginationOptions = {}) {
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

    const [podcasts, total] = await Promise.all([
      Podcast.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Podcast.countDocuments(query),
    ])

    return {
      podcasts,
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
    const podcasts = await Podcast.find({ creator: creatorId })

    const stats = {
      total: podcasts.length,
      published: podcasts.filter((item) => item.status === 'published').length,
      drafts: podcasts.filter((item) => item.status === 'draft').length,
      totalViews: podcasts.reduce((sum, item) => sum + item.views, 0),
      totalLikes: podcasts.reduce((sum, item) => sum + item.likes, 0),
      averageRating:
        podcasts.reduce((sum, item) => sum + item.averageRating, 0) / podcasts.length || 0,
    }

    return stats
  }

  private emitContentPublishedEvent(creatorId: string, contentId: string, title?: string) {
    socialEventBus.publish({
      type: 'social.content.published',
      creatorId,
      contentType: 'podcast',
      contentId,
      title,
      occurredAt: new Date().toISOString(),
    })
  }
}

export const podcastService = new PodcastService()
