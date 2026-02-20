import { socialEventBus } from '../events/socialEvents'
import { PublishStatus } from '../models/BaseContent'
import { Video } from '../models/Video'

/**
 * DTOs para Video
 */
export interface CreateVideoDTO {
  title: string
  description: string
  content: string
  category: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface UpdateVideoDTO {
  title?: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface VideoFilters {
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
 * Service de Videos
 */
export class VideoService {
  /**
   * Listar videos (publico)
   */
  async list(filters: VideoFilters = {}, options: PaginationOptions = {}) {
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

    const [videos, total] = await Promise.all([
      Video.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name username avatar')
        .lean(),
      Video.countDocuments(query),
    ])

    return {
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Obter video por slug
   */
  async getBySlug(slug: string) {
    const video = await Video.findOne({
      slug,
      moderationStatus: { $nin: ['hidden', 'restricted'] },
    }).populate('creator', 'name username avatar bio')

    if (!video) {
      throw new Error('Video nao encontrado')
    }

    return video
  }

  /**
   * Obter video por ID
   */
  async getById(id: string) {
    const video = await Video.findById(id).populate('creator', 'name username avatar')

    if (!video) {
      throw new Error('Video nao encontrado')
    }

    return video
  }

  /**
   * Criar video
   */
  async create(creatorId: string, data: CreateVideoDTO) {
    const video = await Video.create({
      ...data,
      creator: creatorId,
      contentType: 'video',
    })

    if (video.status === 'published') {
      this.emitContentPublishedEvent(creatorId, video.id, video.title)
    }

    return video
  }

  /**
   * Atualizar video
   */
  async update(id: string, creatorId: string, data: UpdateVideoDTO) {
    const video = await Video.findById(id)

    if (!video) {
      throw new Error('Video nao encontrado')
    }

    if (video.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para editar este video')
    }

    const wasPublished = video.status === 'published'
    Object.assign(video, data)
    await video.save()

    if (!wasPublished && video.status === 'published') {
      this.emitContentPublishedEvent(creatorId, video.id, video.title)
    }

    return video
  }

  /**
   * Eliminar video
   */
  async delete(id: string, creatorId: string, isAdmin = false) {
    const video = await Video.findById(id)

    if (!video) {
      throw new Error('Video nao encontrado')
    }

    if (!isAdmin && video.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para eliminar este video')
    }

    await video.deleteOne()

    return { message: 'Video eliminado com sucesso' }
  }

  /**
   * Publicar video
   */
  async publish(id: string, creatorId: string) {
    const video = await Video.findById(id)

    if (!video) {
      throw new Error('Video nao encontrado')
    }

    if (video.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para publicar este video')
    }

    const wasPublished = video.status === 'published'
    video.status = 'published'
    video.publishedAt = new Date()
    await video.save()

    if (!wasPublished) {
      this.emitContentPublishedEvent(creatorId, video.id, video.title)
    }

    return video
  }

  /**
   * Incrementar views
   */
  async incrementViews(id: string) {
    await Video.findByIdAndUpdate(id, { $inc: { views: 1 } })
  }

  /**
   * Toggle like
   */
  async toggleLike(id: string, increment: boolean) {
    const update = increment ? { $inc: { likes: 1 } } : { $inc: { likes: -1 } }
    const video = await Video.findByIdAndUpdate(id, update, { new: true })

    if (!video) {
      throw new Error('Video nao encontrado')
    }

    return video
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(id: string, increment: boolean) {
    const update = increment ? { $inc: { favorites: 1 } } : { $inc: { favorites: -1 } }
    const video = await Video.findByIdAndUpdate(id, update, { new: true })

    if (!video) {
      throw new Error('Video nao encontrado')
    }

    return video
  }

  /**
   * Listar videos do creator (dashboard)
   */
  async getMyVideos(creatorId: string, options: PaginationOptions = {}) {
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

    const [videos, total] = await Promise.all([
      Video.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Video.countDocuments(query),
    ])

    return {
      videos,
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
    const videos = await Video.find({ creator: creatorId })

    const stats = {
      total: videos.length,
      published: videos.filter((item) => item.status === 'published').length,
      drafts: videos.filter((item) => item.status === 'draft').length,
      totalViews: videos.reduce((sum, item) => sum + item.views, 0),
      totalLikes: videos.reduce((sum, item) => sum + item.likes, 0),
      averageRating: videos.reduce((sum, item) => sum + item.averageRating, 0) / videos.length || 0,
    }

    return stats
  }

  private emitContentPublishedEvent(creatorId: string, contentId: string, title?: string) {
    socialEventBus.publish({
      type: 'social.content.published',
      creatorId,
      contentType: 'video',
      contentId,
      title,
      occurredAt: new Date().toISOString(),
    })
  }
}

export const videoService = new VideoService()
