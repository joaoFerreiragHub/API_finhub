import { Request, Response } from 'express'
import { RatingTargetType } from '../models/Rating'
import { surfaceControlService } from '../services/surfaceControl.service'
import { AuthRequest } from '../types/auth'
import { CreateRatingDTO, ratingService, ReviewReactionInput } from '../services/rating.service'

const buildDisabledRatingsPagination = (req: Request) => ({
  page: parseInt(req.query.page as string, 10) || 1,
  limit: parseInt(req.query.limit as string, 10) || 20,
  total: 0,
  pages: 1,
})

/**
 * Criar ou atualizar rating
 * POST /api/ratings
 */
export const createOrUpdateRating = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const surfaceControl = await surfaceControlService.getPublicControl('reviews_write')
    if (!surfaceControl.enabled) {
      return res.status(503).json({
        error: surfaceControl.publicMessage || 'Reviews temporariamente indisponiveis.',
        surfaceControl,
      })
    }

    const data: CreateRatingDTO = req.body
    if (!data.targetType || !data.targetId || !data.rating) {
      return res.status(400).json({
        error: 'Campos obrigatorios: targetType, targetId, rating',
      })
    }

    const rating = await ratingService.createOrUpdate(req.user.id, data)
    return res.status(201).json(rating)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Create/Update rating error:', error)

    if (message.includes('entre 1 e 5')) {
      return res.status(400).json({ error: message })
    }

    return res.status(500).json({
      error: 'Erro ao criar/atualizar rating',
      details: message,
    })
  }
}

/**
 * Obter rating do user para um target
 * GET /api/ratings/my/:targetType/:targetId
 */
export const getMyRating = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const targetType = String(req.params.targetType ?? '')
    const targetId = String(req.params.targetId ?? '')

    const rating = await ratingService.getUserRating(req.user.id, targetType as RatingTargetType, targetId)

    if (!rating) {
      return res.status(404).json({ message: 'Ainda nao avaliaste este conteudo' })
    }

    return res.status(200).json(rating)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Get my rating error:', error)
    return res.status(500).json({
      error: 'Erro ao obter rating',
      details: message,
    })
  }
}

/**
 * Obter reacao do user para uma review
 * GET /api/ratings/:id/reaction/my
 */
export const getMyRatingReaction = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const id = String(req.params.id ?? '')
    const reaction = await ratingService.getUserRatingReaction(id, req.user.id)

    return res.status(200).json({ reaction })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Get my rating reaction error:', error)

    if (message.includes('nao encontrado')) {
      return res.status(404).json({ error: message })
    }

    return res.status(500).json({
      error: 'Erro ao obter reacao',
      details: message,
    })
  }
}

/**
 * Reagir a uma review (like/dislike/remove)
 * POST /api/ratings/:id/reaction
 */
export const reactToRating = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const surfaceControl = await surfaceControlService.getPublicControl('reviews_write')
    if (!surfaceControl.enabled) {
      return res.status(503).json({
        error: surfaceControl.publicMessage || 'Reviews temporariamente indisponiveis.',
        surfaceControl,
      })
    }

    const id = String(req.params.id ?? '')
    const reaction = req.body?.reaction as ReviewReactionInput
    const allowedReactions: ReviewReactionInput[] = ['like', 'dislike', 'none']

    if (!allowedReactions.includes(reaction)) {
      return res.status(400).json({
        error: "Campo 'reaction' invalido. Usa: like | dislike | none",
      })
    }

    const result = await ratingService.reactToRating(id, req.user.id, reaction)
    return res.status(200).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('React to rating error:', error)

    if (message.includes('nao encontrado')) {
      return res.status(404).json({ error: message })
    }

    return res.status(500).json({
      error: 'Erro ao reagir a review',
      details: message,
    })
  }
}

/**
 * Listar ratings de um target
 * GET /api/ratings/:targetType/:targetId
 */
export const listRatings = async (req: Request, res: Response) => {
  try {
    const targetType = String(req.params.targetType ?? '')
    const targetId = String(req.params.targetId ?? '')
    const surfaceControl = await surfaceControlService.getPublicControl('reviews_read')

    if (!surfaceControl.enabled) {
      return res.status(200).json({
        ratings: [],
        pagination: buildDisabledRatingsPagination(req),
        surfaceControl,
      })
    }

    const options = {
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
      sort: req.query.sort as 'recent' | 'rating-high' | 'rating-low' | 'helpful' | undefined,
    }

    const result = await ratingService.listRatings(targetType as RatingTargetType, targetId, options)

    return res.status(200).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('List ratings error:', error)
    return res.status(500).json({
      error: 'Erro ao listar ratings',
      details: message,
    })
  }
}

/**
 * Obter estatisticas de ratings de um target
 * GET /api/ratings/:targetType/:targetId/stats
 */
export const getRatingStats = async (req: Request, res: Response) => {
  try {
    const targetType = String(req.params.targetType ?? '')
    const targetId = String(req.params.targetId ?? '')
    const surfaceControl = await surfaceControlService.getPublicControl('reviews_read')

    if (!surfaceControl.enabled) {
      return res.status(200).json({
        average: 0,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        reviews: {
          withText: 0,
          totalLikes: 0,
          totalDislikes: 0,
        },
        surfaceControl,
      })
    }

    const stats = await ratingService.getStats(targetType as RatingTargetType, targetId)
    return res.status(200).json(stats)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Get rating stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatisticas',
      details: message,
    })
  }
}

/**
 * Eliminar rating
 * DELETE /api/ratings/:id
 */
export const deleteRating = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const surfaceControl = await surfaceControlService.getPublicControl('reviews_write')
    if (!surfaceControl.enabled) {
      return res.status(503).json({
        error: surfaceControl.publicMessage || 'Reviews temporariamente indisponiveis.',
        surfaceControl,
      })
    }

    const id = String(req.params.id ?? '')
    const isAdmin = req.user.role === 'admin'

    const result = await ratingService.delete(id, req.user.id, isAdmin)
    return res.status(200).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Delete rating error:', error)

    if (message.includes('permissao')) {
      return res.status(403).json({ error: message })
    }

    if (message.includes('nao encontrado')) {
      return res.status(404).json({ error: message })
    }

    return res.status(500).json({
      error: 'Erro ao eliminar rating',
      details: message,
    })
  }
}
