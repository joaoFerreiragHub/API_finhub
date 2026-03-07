import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import { CreateReelDTO, ReelFilters, UpdateReelDTO, reelService } from '../services/reel.service'

/**
 * Listar reels (publico)
 * GET /api/reels
 */
export const listReels = async (req: Request, res: Response) => {
  try {
    const filters: ReelFilters = {
      category: req.query.category as string,
      isPremium: req.query.isPremium === 'true',
      isFeatured: req.query.isFeatured === 'true',
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      search: req.query.search as string,
      orientation: req.query.orientation as 'vertical' | 'horizontal',
      minDuration: req.query.minDuration ? parseInt(req.query.minDuration as string) : undefined,
      maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration as string) : undefined,
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await reelService.list(filters, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List reels error:', error)
    return res.status(500).json({
      error: 'Erro ao listar reels',
      details: error.message,
    })
  }
}

/**
 * Obter reel por slug (publico)
 * GET /api/reels/:slug
 */
export const getReelBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? '')

    const reel = await reelService.getBySlug(slug)

    reelService.incrementViews(reel.id).catch(console.error)

    return res.status(200).json(reel)
  } catch (error: any) {
    console.error('Get reel by slug error:', error)
    return res.status(404).json({
      error: 'Reel nao encontrado',
      details: error.message,
    })
  }
}

/**
 * Obter reel por ID (publico)
 * GET /api/reels/id/:id
 */
export const getReelById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? '')

    const reel = await reelService.getById(id)

    return res.status(200).json(reel)
  } catch (error: any) {
    console.error('Get reel by id error:', error)
    return res.status(404).json({
      error: 'Reel nao encontrado',
      details: error.message,
    })
  }
}

/**
 * Criar reel (protegido - creator/admin)
 * POST /api/reels
 */
export const createReel = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const data: CreateReelDTO = req.body

    if (
      !data.title ||
      !data.description ||
      !data.category ||
      !data.videoUrl ||
      typeof data.duration !== 'number'
    ) {
      return res.status(400).json({
        error: 'Campos obrigatorios: title, description, category, videoUrl, duration',
      })
    }

    const reel = await reelService.create(req.user.id, data)

    return res.status(201).json(reel)
  } catch (error: any) {
    console.error('Create reel error:', error)
    return res.status(500).json({
      error: 'Erro ao criar reel',
      details: error.message,
    })
  }
}

/**
 * Atualizar reel (protegido - owner/admin)
 * PATCH /api/reels/:id
 */
export const updateReel = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const id = String(req.params.id ?? '')
    const data: UpdateReelDTO = req.body

    const reel = await reelService.update(id, req.user.id, data)

    return res.status(200).json(reel)
  } catch (error: any) {
    console.error('Update reel error:', error)

    if (error.message.includes('permissao')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao atualizar reel',
      details: error.message,
    })
  }
}

/**
 * Eliminar reel (protegido - owner/admin)
 * DELETE /api/reels/:id
 */
export const deleteReel = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const id = String(req.params.id ?? '')
    const isAdmin = req.user.role === 'admin'

    const result = await reelService.delete(id, req.user.id, isAdmin)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete reel error:', error)

    if (error.message.includes('permissao')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao eliminar reel',
      details: error.message,
    })
  }
}

/**
 * Publicar reel (protegido - owner/admin)
 * PATCH /api/reels/:id/publish
 */
export const publishReel = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const id = String(req.params.id ?? '')

    const reel = await reelService.publish(id, req.user.id)

    return res.status(200).json(reel)
  } catch (error: any) {
    console.error('Publish reel error:', error)

    if (error.message.includes('permissao')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao publicar reel',
      details: error.message,
    })
  }
}

/**
 * Toggle like (protegido)
 * POST /api/reels/:id/like
 */
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const id = String(req.params.id ?? '')
    const { increment } = req.body

    const reel = await reelService.toggleLike(id, increment)

    return res.status(200).json(reel)
  } catch (error: any) {
    console.error('Toggle reel like error:', error)
    return res.status(500).json({
      error: 'Erro ao processar like',
      details: error.message,
    })
  }
}

/**
 * Toggle favorite (protegido)
 * POST /api/reels/:id/favorite
 */
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const id = String(req.params.id ?? '')
    const { increment } = req.body

    const reel = await reelService.toggleFavorite(id, increment)

    return res.status(200).json(reel)
  } catch (error: any) {
    console.error('Toggle reel favorite error:', error)
    return res.status(500).json({
      error: 'Erro ao processar favorito',
      details: error.message,
    })
  }
}

/**
 * Listar meus reels (protegido - creator)
 * GET /api/reels/me
 */
export const getMyReels = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await reelService.getMyReels(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get my reels error:', error)
    return res.status(500).json({
      error: 'Erro ao listar reels',
      details: error.message,
    })
  }
}

/**
 * Estatisticas dos meus reels (protegido - creator)
 * GET /api/reels/stats
 */
export const getMyStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const stats = await reelService.getStats(req.user.id)

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get reel stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatisticas',
      details: error.message,
    })
  }
}
