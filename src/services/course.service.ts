import { socialEventBus } from '../events/socialEvents'
import { PublishStatus } from '../models/BaseContent'
import { Course } from '../models/Course'
import { automatedModerationService } from './automatedModeration.service'

/**
 * DTOs para Course
 */
export interface CreateCourseDTO {
  title: string
  description: string
  content: string
  category: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface UpdateCourseDTO {
  title?: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface CourseFilters {
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
 * Service de Courses
 */
export class CourseService {
  /**
   * Listar cursos (publico)
   */
  async list(filters: CourseFilters = {}, options: PaginationOptions = {}) {
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

    const [courses, total] = await Promise.all([
      Course.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name username avatar')
        .lean(),
      Course.countDocuments(query),
    ])

    return {
      courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Obter curso por slug
   */
  async getBySlug(slug: string) {
    const course = await Course.findOne({
      slug,
      moderationStatus: { $nin: ['hidden', 'restricted'] },
    }).populate('creator', 'name username avatar bio')

    if (!course) {
      throw new Error('Curso nao encontrado')
    }

    return course
  }

  /**
   * Obter curso por ID
   */
  async getById(id: string) {
    const course = await Course.findById(id).populate('creator', 'name username avatar')

    if (!course) {
      throw new Error('Curso nao encontrado')
    }

    return course
  }

  /**
   * Criar curso
   */
  async create(creatorId: string, data: CreateCourseDTO) {
    const course = await Course.create({
      ...data,
      creator: creatorId,
      contentType: 'course',
    })

    const moderationResult = await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'course',
      contentId: course.id,
      triggerSource: 'create',
    })
    if (moderationResult.automation.executed) {
      course.moderationStatus = 'hidden'
    }

    if (course.status === 'published' && course.moderationStatus === 'visible') {
      this.emitContentPublishedEvent(creatorId, course.id, course.title)
    }

    return course
  }

  /**
   * Atualizar curso
   */
  async update(id: string, creatorId: string, data: UpdateCourseDTO) {
    const course = await Course.findById(id)

    if (!course) {
      throw new Error('Curso nao encontrado')
    }

    if (course.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para editar este curso')
    }

    const wasPublished = course.status === 'published'
    Object.assign(course, data)
    await course.save()

    const moderationResult = await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'course',
      contentId: course.id,
      triggerSource: 'update',
    })
    if (moderationResult.automation.executed) {
      course.moderationStatus = 'hidden'
    }

    if (!wasPublished && course.status === 'published' && course.moderationStatus === 'visible') {
      this.emitContentPublishedEvent(creatorId, course.id, course.title)
    }

    return course
  }

  /**
   * Eliminar curso
   */
  async delete(id: string, creatorId: string, isAdmin = false) {
    const course = await Course.findById(id)

    if (!course) {
      throw new Error('Curso nao encontrado')
    }

    if (!isAdmin && course.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para eliminar este curso')
    }

    await course.deleteOne()

    return { message: 'Curso eliminado com sucesso' }
  }

  /**
   * Publicar curso
   */
  async publish(id: string, creatorId: string) {
    const course = await Course.findById(id)

    if (!course) {
      throw new Error('Curso nao encontrado')
    }

    if (course.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para publicar este curso')
    }

    const wasPublished = course.status === 'published'
    course.status = 'published'
    course.publishedAt = new Date()
    await course.save()

    const moderationResult = await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'course',
      contentId: course.id,
      triggerSource: 'publish',
    })
    if (moderationResult.automation.executed) {
      course.moderationStatus = 'hidden'
    }

    if (!wasPublished && course.moderationStatus === 'visible') {
      this.emitContentPublishedEvent(creatorId, course.id, course.title)
    }

    return course
  }

  /**
   * Incrementar views
   */
  async incrementViews(id: string) {
    await Course.findByIdAndUpdate(id, { $inc: { views: 1 } })
  }

  /**
   * Toggle like
   */
  async toggleLike(id: string, increment: boolean) {
    const update = increment ? { $inc: { likes: 1 } } : { $inc: { likes: -1 } }
    const course = await Course.findByIdAndUpdate(id, update, { new: true })

    if (!course) {
      throw new Error('Curso nao encontrado')
    }

    return course
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(id: string, increment: boolean) {
    const update = increment ? { $inc: { favorites: 1 } } : { $inc: { favorites: -1 } }
    const course = await Course.findByIdAndUpdate(id, update, { new: true })

    if (!course) {
      throw new Error('Curso nao encontrado')
    }

    return course
  }

  /**
   * Listar cursos do creator (dashboard)
   */
  async getMyCourses(creatorId: string, options: PaginationOptions = {}) {
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

    const [courses, total] = await Promise.all([
      Course.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Course.countDocuments(query),
    ])

    return {
      courses,
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
    const courses = await Course.find({ creator: creatorId })

    const stats = {
      total: courses.length,
      published: courses.filter((item) => item.status === 'published').length,
      drafts: courses.filter((item) => item.status === 'draft').length,
      totalViews: courses.reduce((sum, item) => sum + item.views, 0),
      totalLikes: courses.reduce((sum, item) => sum + item.likes, 0),
      averageRating: courses.reduce((sum, item) => sum + item.averageRating, 0) / courses.length || 0,
    }

    return stats
  }

  private emitContentPublishedEvent(creatorId: string, contentId: string, title?: string) {
    socialEventBus.publish({
      type: 'social.content.published',
      creatorId,
      contentType: 'course',
      contentId,
      title,
      occurredAt: new Date().toISOString(),
    })
  }
}

export const courseService = new CourseService()
