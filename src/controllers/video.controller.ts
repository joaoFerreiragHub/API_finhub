import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  videoService,
  CreateVideoDTO,
  UpdateVideoDTO,
  VideoFilters,
} from '../services/video.service'

/**
 * Listar artigos (público)
 * GET /api/videos
 */
export const listVideos = async (req: Request, res: Response) => {
  try {
    const filters: VideoFilters = {
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

    const result = await videoService.list(filters, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List videos error:', error)
    return res.status(500).json({
      error: 'Erro ao listar artigos',
      details: error.message,
    })
  }
}

/**
 * Obter artigo por slug (público)
 * GET /api/videos/:slug
 */
export const getVideoBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? "")

    const video = await videoService.getBySlug(slug)

    // Incrementar views (async, não bloquear response)
    videoService.incrementViews(video.id).catch(console.error)

    return res.status(200).json(video)
  } catch (error: any) {
    console.error('Get video error:', error)
    return res.status(404).json({
      error: 'Artigo não encontrado',
      details: error.message,
    })
  }
}

/**
 * Criar artigo (protegido - creator/admin)
 * POST /api/videos
 */
export const createVideo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const data: CreateVideoDTO = req.body

    // Validar campos obrigatórios
    if (!data.title || !data.description || !data.content || !data.category) {
      return res.status(400).json({
        error: 'Campos obrigatórios: title, description, content, category',
      })
    }

    const video = await videoService.create(req.user.id, data)

    return res.status(201).json(video)
  } catch (error: any) {
    console.error('Create video error:', error)
    return res.status(500).json({
      error: 'Erro ao criar artigo',
      details: error.message,
    })
  }
}

/**
 * Atualizar artigo (protegido - owner/admin)
 * PATCH /api/videos/:id
 */
export const updateVideo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const data: UpdateVideoDTO = req.body

    const video = await videoService.update(id, req.user.id, data)

    return res.status(200).json(video)
  } catch (error: any) {
    console.error('Update video error:', error)

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
 * DELETE /api/videos/:id
 */
export const deleteVideo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const isAdmin = req.user.role === 'admin'

    const result = await videoService.delete(id, req.user.id, isAdmin)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete video error:', error)

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
 * PATCH /api/videos/:id/publish
 */
export const publishVideo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")

    const video = await videoService.publish(id, req.user.id)

    return res.status(200).json(video)
  } catch (error: any) {
    console.error('Publish video error:', error)

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
 * POST /api/videos/:id/like
 */
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const { increment } = req.body // true para like, false para unlike

    const video = await videoService.toggleLike(id, increment)

    return res.status(200).json(video)
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
 * POST /api/videos/:id/favorite
 */
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const { increment } = req.body // true para favorite, false para unfavorite

    const video = await videoService.toggleFavorite(id, increment)

    return res.status(200).json(video)
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
 * GET /api/videos/my
 */
export const getMyVideos = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await videoService.getMyVideos(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get my videos error:', error)
    return res.status(500).json({
      error: 'Erro ao listar artigos',
      details: error.message,
    })
  }
}

/**
 * Estatísticas dos meus artigos (protegido - creator)
 * GET /api/videos/stats
 */
export const getMyStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const stats = await videoService.getStats(req.user.id)

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatísticas',
      details: error.message,
    })
  }
}
