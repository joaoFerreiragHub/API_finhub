import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  liveeventService,
  CreateLiveEventDTO,
  UpdateLiveEventDTO,
  LiveEventFilters,
} from '../services/liveevent.service'

/**
 * Listar artigos (público)
 * GET /api/liveevents
 */
export const listLives = async (req: Request, res: Response) => {
  try {
    const filters: LiveEventFilters = {
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

    const result = await liveeventService.list(filters, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List liveevents error:', error)
    return res.status(500).json({
      error: 'Erro ao listar artigos',
      details: error.message,
    })
  }
}

/**
 * Obter artigo por slug (público)
 * GET /api/liveevents/:slug
 */
export const getLiveBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? "")

    const liveevent = await liveeventService.getBySlug(slug)

    // Incrementar views (async, não bloquear response)
    liveeventService.incrementViews(liveevent.id).catch(console.error)

    return res.status(200).json(liveevent)
  } catch (error: any) {
    console.error('Get liveevent error:', error)
    return res.status(404).json({
      error: 'Artigo não encontrado',
      details: error.message,
    })
  }
}

/**
 * Criar artigo (protegido - creator/admin)
 * POST /api/liveevents
 */
export const createLive = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const data: CreateLiveEventDTO = req.body

    // Validar campos obrigatórios
    if (!data.title || !data.description || !data.content || !data.category) {
      return res.status(400).json({
        error: 'Campos obrigatórios: title, description, content, category',
      })
    }

    const liveevent = await liveeventService.create(req.user.id, data)

    return res.status(201).json(liveevent)
  } catch (error: any) {
    console.error('Create liveevent error:', error)
    return res.status(500).json({
      error: 'Erro ao criar artigo',
      details: error.message,
    })
  }
}

/**
 * Atualizar artigo (protegido - owner/admin)
 * PATCH /api/liveevents/:id
 */
export const updateLive = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const data: UpdateLiveEventDTO = req.body

    const liveevent = await liveeventService.update(id, req.user.id, data)

    return res.status(200).json(liveevent)
  } catch (error: any) {
    console.error('Update liveevent error:', error)

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
 * DELETE /api/liveevents/:id
 */
export const deleteLive = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const isAdmin = req.user.role === 'admin'

    const result = await liveeventService.delete(id, req.user.id, isAdmin)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete liveevent error:', error)

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
 * PATCH /api/liveevents/:id/publish
 */
export const publishLive = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")

    const liveevent = await liveeventService.publish(id, req.user.id)

    return res.status(200).json(liveevent)
  } catch (error: any) {
    console.error('Publish liveevent error:', error)

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
 * POST /api/liveevents/:id/like
 */
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const { increment } = req.body // true para like, false para unlike

    const liveevent = await liveeventService.toggleLike(id, increment)

    return res.status(200).json(liveevent)
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
 * POST /api/liveevents/:id/favorite
 */
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const { increment } = req.body // true para favorite, false para unfavorite

    const liveevent = await liveeventService.toggleFavorite(id, increment)

    return res.status(200).json(liveevent)
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
 * GET /api/liveevents/my
 */
export const getMyLives = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await liveeventService.getMyLiveEvents(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get my liveevents error:', error)
    return res.status(500).json({
      error: 'Erro ao listar artigos',
      details: error.message,
    })
  }
}

/**
 * Estatísticas dos meus artigos (protegido - creator)
 * GET /api/liveevents/stats
 */
export const getMyStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const stats = await liveeventService.getStats(req.user.id)

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatísticas',
      details: error.message,
    })
  }
}
