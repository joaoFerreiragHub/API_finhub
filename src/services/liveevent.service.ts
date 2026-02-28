import { socialEventBus } from '../events/socialEvents'
import { PublishStatus } from '../models/BaseContent'
import { LiveEvent } from '../models/LiveEvent'
import { automatedModerationService } from './automatedModeration.service'

/**
 * DTOs para LiveEvent
 */
export interface CreateLiveEventDTO {
  title: string
  description: string
  content: string
  category: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface UpdateLiveEventDTO {
  title?: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface LiveEventFilters {
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
 * Service de LiveEvents
 */
export class LiveEventService {
  /**
   * Listar lives (publico)
   */
  async list(filters: LiveEventFilters = {}, options: PaginationOptions = {}) {
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

    const [liveevents, total] = await Promise.all([
      LiveEvent.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name username avatar')
        .lean(),
      LiveEvent.countDocuments(query),
    ])

    return {
      liveevents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Obter live por slug
   */
  async getBySlug(slug: string) {
    const liveevent = await LiveEvent.findOne({
      slug,
      moderationStatus: { $nin: ['hidden', 'restricted'] },
    }).populate('creator', 'name username avatar bio')

    if (!liveevent) {
      throw new Error('Live nao encontrada')
    }

    return liveevent
  }

  /**
   * Obter live por ID
   */
  async getById(id: string) {
    const liveevent = await LiveEvent.findById(id).populate('creator', 'name username avatar')

    if (!liveevent) {
      throw new Error('Live nao encontrada')
    }

    return liveevent
  }

  /**
   * Criar live
   */
  async create(creatorId: string, data: CreateLiveEventDTO) {
    const liveevent = await LiveEvent.create({
      ...data,
      creator: creatorId,
      contentType: 'live',
    })

    const moderationResult = await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'live',
      contentId: liveevent.id,
      triggerSource: 'create',
    })
    if (moderationResult.automation.executed) {
      liveevent.moderationStatus = 'hidden'
    }

    if (liveevent.status === 'published' && liveevent.moderationStatus === 'visible') {
      this.emitContentPublishedEvent(creatorId, liveevent.id, liveevent.title)
    }

    return liveevent
  }

  /**
   * Atualizar live
   */
  async update(id: string, creatorId: string, data: UpdateLiveEventDTO) {
    const liveevent = await LiveEvent.findById(id)

    if (!liveevent) {
      throw new Error('Live nao encontrada')
    }

    if (liveevent.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para editar esta live')
    }

    const wasPublished = liveevent.status === 'published'
    Object.assign(liveevent, data)
    await liveevent.save()

    const moderationResult = await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'live',
      contentId: liveevent.id,
      triggerSource: 'update',
    })
    if (moderationResult.automation.executed) {
      liveevent.moderationStatus = 'hidden'
    }

    if (
      !wasPublished &&
      liveevent.status === 'published' &&
      liveevent.moderationStatus === 'visible'
    ) {
      this.emitContentPublishedEvent(creatorId, liveevent.id, liveevent.title)
    }

    return liveevent
  }

  /**
   * Eliminar live
   */
  async delete(id: string, creatorId: string, isAdmin = false) {
    const liveevent = await LiveEvent.findById(id)

    if (!liveevent) {
      throw new Error('Live nao encontrada')
    }

    if (!isAdmin && liveevent.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para eliminar esta live')
    }

    await liveevent.deleteOne()

    return { message: 'Live eliminada com sucesso' }
  }

  /**
   * Publicar live
   */
  async publish(id: string, creatorId: string) {
    const liveevent = await LiveEvent.findById(id)

    if (!liveevent) {
      throw new Error('Live nao encontrada')
    }

    if (liveevent.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para publicar esta live')
    }

    const wasPublished = liveevent.status === 'published'
    liveevent.status = 'published'
    liveevent.publishedAt = new Date()
    await liveevent.save()

    const moderationResult = await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'live',
      contentId: liveevent.id,
      triggerSource: 'publish',
    })
    if (moderationResult.automation.executed) {
      liveevent.moderationStatus = 'hidden'
    }

    if (!wasPublished && liveevent.moderationStatus === 'visible') {
      this.emitContentPublishedEvent(creatorId, liveevent.id, liveevent.title)
    }

    return liveevent
  }

  /**
   * Incrementar views
   */
  async incrementViews(id: string) {
    await LiveEvent.findByIdAndUpdate(id, { $inc: { views: 1 } })
  }

  /**
   * Toggle like
   */
  async toggleLike(id: string, increment: boolean) {
    const update = increment ? { $inc: { likes: 1 } } : { $inc: { likes: -1 } }
    const liveevent = await LiveEvent.findByIdAndUpdate(id, update, { new: true })

    if (!liveevent) {
      throw new Error('Live nao encontrada')
    }

    return liveevent
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(id: string, increment: boolean) {
    const update = increment ? { $inc: { favorites: 1 } } : { $inc: { favorites: -1 } }
    const liveevent = await LiveEvent.findByIdAndUpdate(id, update, { new: true })

    if (!liveevent) {
      throw new Error('Live nao encontrada')
    }

    return liveevent
  }

  /**
   * Listar lives do creator (dashboard)
   */
  async getMyLiveEvents(creatorId: string, options: PaginationOptions = {}) {
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

    const [liveevents, total] = await Promise.all([
      LiveEvent.find(query).sort(sort).skip(skip).limit(limit).lean(),
      LiveEvent.countDocuments(query),
    ])

    return {
      liveevents,
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
    const liveevents = await LiveEvent.find({ creator: creatorId })

    const stats = {
      total: liveevents.length,
      published: liveevents.filter((item) => item.status === 'published').length,
      drafts: liveevents.filter((item) => item.status === 'draft').length,
      totalViews: liveevents.reduce((sum, item) => sum + item.views, 0),
      totalLikes: liveevents.reduce((sum, item) => sum + item.likes, 0),
      averageRating:
        liveevents.reduce((sum, item) => sum + item.averageRating, 0) / liveevents.length || 0,
    }

    return stats
  }

  private emitContentPublishedEvent(creatorId: string, contentId: string, title?: string) {
    socialEventBus.publish({
      type: 'social.content.published',
      creatorId,
      contentType: 'live',
      contentId,
      title,
      occurredAt: new Date().toISOString(),
    })
  }
}

export const liveeventService = new LiveEventService()
