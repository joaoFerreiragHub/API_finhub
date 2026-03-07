import { socialEventBus } from '../events/socialEvents'
import { PublishStatus } from '../models/BaseContent'
import { Reel } from '../models/Reel'
import { automatedModerationService } from './automatedModeration.service'

export interface CreateReelDTO {
  title: string
  description: string
  content?: string
  category: string
  videoUrl: string
  duration: number
  orientation?: 'vertical' | 'horizontal'
  externalPlatform?: 'youtube' | 'tiktok' | 'instagram'
  externalId?: string
  tags?: string[]
  coverImage?: string
  thumbnail?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface UpdateReelDTO {
  title?: string
  description?: string
  content?: string
  category?: string
  videoUrl?: string
  duration?: number
  orientation?: 'vertical' | 'horizontal'
  externalPlatform?: 'youtube' | 'tiktok' | 'instagram'
  externalId?: string
  tags?: string[]
  coverImage?: string
  thumbnail?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface ReelFilters {
  category?: string
  isPremium?: boolean
  isFeatured?: boolean
  status?: PublishStatus
  creator?: string
  tags?: string[]
  search?: string
  minDuration?: number
  maxDuration?: number
  orientation?: 'vertical' | 'horizontal'
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sort?: string
}

const clampDuration = (value?: number): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(1, Math.min(90, Math.round(value)))
}

export class ReelService {
  async list(filters: ReelFilters = {}, options: PaginationOptions = {}) {
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

    const minDuration = clampDuration(filters.minDuration)
    const maxDuration = clampDuration(filters.maxDuration)
    if (minDuration || maxDuration) {
      query.duration = {
        ...(minDuration ? { $gte: minDuration } : {}),
        ...(maxDuration ? { $lte: maxDuration } : {}),
      }
    }

    if (filters.orientation) {
      query.orientation = filters.orientation
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

    const [reels, total] = await Promise.all([
      Reel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name username avatar')
        .lean(),
      Reel.countDocuments(query),
    ])

    return {
      reels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getBySlug(slug: string) {
    const reel = await Reel.findOne({
      slug,
      moderationStatus: { $nin: ['hidden', 'restricted'] },
    }).populate('creator', 'name username avatar bio')

    if (!reel) {
      throw new Error('Reel nao encontrado')
    }

    return reel
  }

  async getById(id: string) {
    const reel = await Reel.findById(id).populate('creator', 'name username avatar')

    if (!reel) {
      throw new Error('Reel nao encontrado')
    }

    return reel
  }

  async create(creatorId: string, data: CreateReelDTO) {
    const duration = clampDuration(data.duration)
    if (!duration) {
      throw new Error('Duracao invalida para reel')
    }

    const reel = await Reel.create({
      ...data,
      duration,
      content: data.content || data.description,
      creator: creatorId,
      contentType: 'video',
    })

    const moderationResult = await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'video',
      contentId: reel.id,
      triggerSource: 'create',
    })
    if (moderationResult.automation.executed) {
      reel.moderationStatus = 'hidden'
    }

    if (reel.status === 'published' && reel.moderationStatus === 'visible') {
      this.emitContentPublishedEvent(creatorId, reel.id, reel.title)
    }

    return reel
  }

  async update(id: string, creatorId: string, data: UpdateReelDTO) {
    const reel = await Reel.findById(id)

    if (!reel) {
      throw new Error('Reel nao encontrado')
    }

    if (reel.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para editar este reel')
    }

    const nextData: UpdateReelDTO = { ...data }

    if (typeof nextData.duration === 'number') {
      const duration = clampDuration(nextData.duration)
      if (!duration) {
        throw new Error('Duracao invalida para reel')
      }
      nextData.duration = duration
    }

    if (nextData.description && !nextData.content) {
      nextData.content = nextData.description
    }

    const wasPublished = reel.status === 'published'
    Object.assign(reel, nextData)
    await reel.save()

    const moderationResult = await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'video',
      contentId: reel.id,
      triggerSource: 'update',
    })
    if (moderationResult.automation.executed) {
      reel.moderationStatus = 'hidden'
    }

    if (!wasPublished && reel.status === 'published' && reel.moderationStatus === 'visible') {
      this.emitContentPublishedEvent(creatorId, reel.id, reel.title)
    }

    return reel
  }

  async delete(id: string, creatorId: string, isAdmin = false) {
    const reel = await Reel.findById(id)

    if (!reel) {
      throw new Error('Reel nao encontrado')
    }

    if (!isAdmin && reel.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para eliminar este reel')
    }

    await reel.deleteOne()

    return { message: 'Reel eliminado com sucesso' }
  }

  async publish(id: string, creatorId: string) {
    const reel = await Reel.findById(id)

    if (!reel) {
      throw new Error('Reel nao encontrado')
    }

    if (reel.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para publicar este reel')
    }

    const wasPublished = reel.status === 'published'
    reel.status = 'published'
    reel.publishedAt = new Date()
    await reel.save()

    const moderationResult = await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'video',
      contentId: reel.id,
      triggerSource: 'publish',
    })
    if (moderationResult.automation.executed) {
      reel.moderationStatus = 'hidden'
    }

    if (!wasPublished && reel.moderationStatus === 'visible') {
      this.emitContentPublishedEvent(creatorId, reel.id, reel.title)
    }

    return reel
  }

  async incrementViews(id: string) {
    await Reel.findByIdAndUpdate(id, { $inc: { views: 1 } })
  }

  async toggleLike(id: string, increment: boolean) {
    const update = increment ? { $inc: { likes: 1 } } : { $inc: { likes: -1 } }
    const reel = await Reel.findByIdAndUpdate(id, update, { new: true })

    if (!reel) {
      throw new Error('Reel nao encontrado')
    }

    return reel
  }

  async toggleFavorite(id: string, increment: boolean) {
    const update = increment ? { $inc: { favorites: 1 } } : { $inc: { favorites: -1 } }
    const reel = await Reel.findByIdAndUpdate(id, update, { new: true })

    if (!reel) {
      throw new Error('Reel nao encontrado')
    }

    return reel
  }

  async getMyReels(creatorId: string, options: PaginationOptions = {}) {
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

    const [reels, total] = await Promise.all([
      Reel.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Reel.countDocuments(query),
    ])

    return {
      reels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getStats(creatorId: string) {
    const reels = await Reel.find({ creator: creatorId })

    const stats = {
      total: reels.length,
      published: reels.filter((item) => item.status === 'published').length,
      drafts: reels.filter((item) => item.status === 'draft').length,
      totalViews: reels.reduce((sum, item) => sum + item.views, 0),
      totalLikes: reels.reduce((sum, item) => sum + item.likes, 0),
      averageRating: reels.reduce((sum, item) => sum + item.averageRating, 0) / reels.length || 0,
    }

    return stats
  }

  private emitContentPublishedEvent(creatorId: string, contentId: string, title?: string) {
    socialEventBus.publish({
      type: 'social.content.published',
      creatorId,
      contentType: 'reel',
      contentId,
      title,
      occurredAt: new Date().toISOString(),
    })
  }
}

export const reelService = new ReelService()
