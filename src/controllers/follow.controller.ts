import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import { followService } from '../services/follow.service'

/**
 * Seguir utilizador
 * POST /api/follow/:userId
 */
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const userId = String(req.params.userId ?? '')
    const result = await followService.followUser(req.user.id, userId)
    const statusCode = result.created ? 201 : 200

    return res.status(statusCode).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Follow user error:', error)

    if (message.includes('nao encontrado') || message.includes('Nao podes')) {
      return res.status(400).json({ error: message })
    }

    return res.status(500).json({
      error: 'Erro ao seguir utilizador',
      details: message,
    })
  }
}

/**
 * Deixar de seguir utilizador
 * DELETE /api/follow/:userId
 */
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const userId = String(req.params.userId ?? '')
    const result = await followService.unfollowUser(req.user.id, userId)

    return res.status(200).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Unfollow user error:', error)

    return res.status(500).json({
      error: 'Erro ao deixar de seguir utilizador',
      details: message,
    })
  }
}

/**
 * Verificar se esta a seguir
 * GET /api/follow/check/:userId
 */
export const checkFollowing = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const userId = String(req.params.userId ?? '')
    const isFollowing = await followService.isFollowing(req.user.id, userId)

    return res.status(200).json({ isFollowing })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Check following error:', error)
    return res.status(500).json({
      error: 'Erro ao verificar',
      details: message,
    })
  }
}

/**
 * Listar seguidores de um utilizador
 * GET /api/follow/:userId/followers
 */
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId ?? '')

    const options = {
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
    }

    const result = await followService.getFollowers(userId, options)

    return res.status(200).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Get followers error:', error)
    return res.status(500).json({
      error: 'Erro ao obter seguidores',
      details: message,
    })
  }
}

/**
 * Listar quem o utilizador esta a seguir
 * GET /api/follow/:userId/following
 */
export const getFollowing = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId ?? '')

    const options = {
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
    }

    const result = await followService.getFollowing(userId, options)

    return res.status(200).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Get following error:', error)
    return res.status(500).json({
      error: 'Erro ao obter following',
      details: message,
    })
  }
}

/**
 * Obter amigos mutuos
 * GET /api/follow/mutual
 */
export const getMutualFollows = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const mutualUsers = await followService.getMutualFollows(req.user.id)

    return res.status(200).json({ mutual: mutualUsers, total: mutualUsers.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Get mutual follows error:', error)
    return res.status(500).json({
      error: 'Erro ao obter seguimentos mutuos',
      details: message,
    })
  }
}

/**
 * Estatisticas de follow
 * GET /api/follow/:userId/stats
 */
export const getFollowStats = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId ?? '')
    const stats = await followService.getStats(userId)

    return res.status(200).json(stats)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error('Get follow stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatisticas',
      details: message,
    })
  }
}
