import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  courseService,
  CreateCourseDTO,
  UpdateCourseDTO,
  CourseFilters,
} from '../services/course.service'

/**
 * Listar artigos (público)
 * GET /api/courses
 */
export const listCourses = async (req: Request, res: Response) => {
  try {
    const filters: CourseFilters = {
      category: req.query.category as string,
      isPremium: req.query.isPremium === 'true',
      isFeatured: req.query.isFeatured === 'true',
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      search: req.query.search as string,
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await courseService.list(filters, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List courses error:', error)
    return res.status(500).json({
      error: 'Erro ao listar artigos',
      details: error.message,
    })
  }
}

/**
 * Obter artigo por slug (público)
 * GET /api/courses/:slug
 */
export const getCourseBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? "")

    const course = await courseService.getBySlug(slug)

    // Incrementar views (async, não bloquear response)
    courseService.incrementViews(course.id).catch(console.error)

    return res.status(200).json(course)
  } catch (error: any) {
    console.error('Get course error:', error)
    return res.status(404).json({
      error: 'Artigo não encontrado',
      details: error.message,
    })
  }
}

/**
 * Criar artigo (protegido - creator/admin)
 * POST /api/courses
 */
export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const data: CreateCourseDTO = req.body

    // Validar campos obrigatórios
    if (!data.title || !data.description || !data.content || !data.category) {
      return res.status(400).json({
        error: 'Campos obrigatórios: title, description, content, category',
      })
    }

    const course = await courseService.create(req.user.id, data)

    return res.status(201).json(course)
  } catch (error: any) {
    console.error('Create course error:', error)
    return res.status(500).json({
      error: 'Erro ao criar artigo',
      details: error.message,
    })
  }
}

/**
 * Atualizar artigo (protegido - owner/admin)
 * PATCH /api/courses/:id
 */
export const updateCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const data: UpdateCourseDTO = req.body

    const course = await courseService.update(id, req.user.id, data)

    return res.status(200).json(course)
  } catch (error: any) {
    console.error('Update course error:', error)

    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao atualizar artigo',
      details: error.message,
    })
  }
}

/**
 * Eliminar artigo (protegido - owner/admin)
 * DELETE /api/courses/:id
 */
export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const isAdmin = req.user.role === 'admin'

    const result = await courseService.delete(id, req.user.id, isAdmin)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete course error:', error)

    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao eliminar artigo',
      details: error.message,
    })
  }
}

/**
 * Publicar artigo (protegido - owner/admin)
 * PATCH /api/courses/:id/publish
 */
export const publishCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")

    const course = await courseService.publish(id, req.user.id)

    return res.status(200).json(course)
  } catch (error: any) {
    console.error('Publish course error:', error)

    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao publicar artigo',
      details: error.message,
    })
  }
}

/**
 * Toggle like (protegido)
 * POST /api/courses/:id/like
 */
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const { increment } = req.body // true para like, false para unlike

    const course = await courseService.toggleLike(id, increment)

    return res.status(200).json(course)
  } catch (error: any) {
    console.error('Toggle like error:', error)
    return res.status(500).json({
      error: 'Erro ao processar like',
      details: error.message,
    })
  }
}

/**
 * Toggle favorite (protegido)
 * POST /api/courses/:id/favorite
 */
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const { increment } = req.body // true para favorite, false para unfavorite

    const course = await courseService.toggleFavorite(id, increment)

    return res.status(200).json(course)
  } catch (error: any) {
    console.error('Toggle favorite error:', error)
    return res.status(500).json({
      error: 'Erro ao processar favorito',
      details: error.message,
    })
  }
}

/**
 * Listar meus artigos (protegido - creator)
 * GET /api/courses/my
 */
export const getMyCourses = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await courseService.getMyCourses(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get my courses error:', error)
    return res.status(500).json({
      error: 'Erro ao listar artigos',
      details: error.message,
    })
  }
}

/**
 * Estatísticas dos meus artigos (protegido - creator)
 * GET /api/courses/stats
 */
export const getMyStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const stats = await courseService.getStats(req.user.id)

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatísticas',
      details: error.message,
    })
  }
}
