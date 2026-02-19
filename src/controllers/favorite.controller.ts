import { Response } from 'express'
import { FavoriteTargetType } from '../models/Favorite'
import { favoriteService } from '../services/favorite.service'
import { AuthRequest } from '../types/auth'

/**
 * Adicionar aos favoritos
 * POST /api/favorites
 */
export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const { targetType, targetId } = req.body as {
      targetType?: FavoriteTargetType
      targetId?: string
    }

    if (!targetType || !targetId) {
      return res.status(400).json({
        error: 'Campos obrigatorios: targetType, targetId',
      })
    }

    const result = await favoriteService.addFavorite(req.user.id, targetType, targetId)
    const statusCode = result.created ? 201 : 200

    return res.status(statusCode).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Add favorite error:', error)

    if (message.includes('nao encontrado')) {
      return res.status(404).json({ error: message })
    }

    if (message.includes('Tipo de conteudo invalido')) {
      return res.status(400).json({ error: message })
    }

    return res.status(500).json({
      error: 'Erro ao adicionar aos favoritos',
      details: message,
    })
  }
}

/**
 * Remover dos favoritos
 * DELETE /api/favorites
 */
export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const { targetType, targetId } = req.body as {
      targetType?: FavoriteTargetType
      targetId?: string
    }

    if (!targetType || !targetId) {
      return res.status(400).json({
        error: 'Campos obrigatorios: targetType, targetId',
      })
    }

    const result = await favoriteService.removeFavorite(req.user.id, targetType, targetId)

    return res.status(200).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Remove favorite error:', error)

    return res.status(500).json({
      error: 'Erro ao remover dos favoritos',
      details: message,
    })
  }
}

/**
 * Verificar se esta nos favoritos
 * GET /api/favorites/check
 */
export const checkFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const { targetType, targetId } = req.query

    if (!targetType || !targetId) {
      return res.status(400).json({
        error: 'Query params obrigatorios: targetType, targetId',
      })
    }

    const isFavorite = await favoriteService.isFavorite(
      req.user.id,
      targetType as FavoriteTargetType,
      targetId as string
    )

    return res.status(200).json({ isFavorite })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Check favorite error:', error)
    return res.status(500).json({
      error: 'Erro ao verificar favorito',
      details: message,
    })
  }
}

/**
 * Listar favoritos do utilizador
 * GET /api/favorites
 */
export const getUserFavorites = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const targetType = req.query.targetType as FavoriteTargetType | undefined
    const options = {
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
    }

    const result = await favoriteService.getUserFavorites(req.user.id, targetType, options)

    return res.status(200).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Get user favorites error:', error)
    return res.status(500).json({
      error: 'Erro ao obter favoritos',
      details: message,
    })
  }
}

/**
 * Estatisticas de favoritos
 * GET /api/favorites/stats
 */
export const getFavoriteStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const stats = await favoriteService.getFavoriteStats(req.user.id)

    return res.status(200).json(stats)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Get favorite stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatisticas',
      details: message,
    })
  }
}
