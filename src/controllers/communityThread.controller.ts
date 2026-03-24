import { Response } from 'express'
import {
  CommunityThreadServiceError,
  communityThreadService,
} from '../services/communityThread.service'
import { AuthRequest } from '../types/auth'
import { CommunityVoteDirection } from '../models/CommunityVote'
import { xpService } from '../services/xp.service'

const parsePositiveIntegerQuery = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const parseSortQuery = (value: unknown): 'recent' | 'popular' => {
  if (value === 'popular') return 'popular'
  return 'recent'
}

const respondServiceError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof CommunityThreadServiceError) {
    return res.status(error.statusCode).json({ error: error.message })
  }

  const details = error instanceof Error ? error.message : undefined
  return res.status(500).json({
    error: fallbackMessage,
    details,
  })
}

/**
 * GET /api/community/rooms/:slug/posts
 */
export const listCommunityRoomPosts = async (req: AuthRequest, res: Response) => {
  try {
    const slug = typeof req.params.slug === 'string' ? req.params.slug : ''
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const result = await communityThreadService.listPostsByRoom(slug, req.user, {
      limit: parsePositiveIntegerQuery(req.query.limit),
      cursor,
      sort: parseSortQuery(req.query.sort),
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('List community posts error:', error)
    return respondServiceError(res, error, 'Erro ao listar posts da comunidade.')
  }
}

/**
 * POST /api/community/rooms/:slug/posts
 */
export const createCommunityRoomPost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const slug = typeof req.params.slug === 'string' ? req.params.slug : ''
    const result = await communityThreadService.createPost(slug, req.user, {
      title: String(req.body?.title ?? ''),
      content: String(req.body?.content ?? ''),
      imageUrl: typeof req.body?.imageUrl === 'string' ? req.body.imageUrl : undefined,
      hubContentRef: req.body?.hubContentRef
        ? {
            contentType: String(req.body.hubContentRef.contentType ?? ''),
            contentId: String(req.body.hubContentRef.contentId ?? ''),
          }
        : undefined,
    })

    return res.status(201).json(result)
  } catch (error) {
    console.error('Create community post error:', error)
    return respondServiceError(res, error, 'Erro ao criar post da comunidade.')
  }
}

/**
 * GET /api/community/posts/:id
 */
export const getCommunityPostDetail = async (req: AuthRequest, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : ''
    const result = await communityThreadService.getPostDetailById(id, req.user)
    return res.status(200).json(result)
  } catch (error) {
    console.error('Get community post detail error:', error)
    return respondServiceError(res, error, 'Erro ao carregar detalhe do post.')
  }
}

/**
 * POST /api/community/posts/:id/replies
 */
export const createCommunityPostReply = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const id = typeof req.params.id === 'string' ? req.params.id : ''
    const result = await communityThreadService.createReply(id, req.user, {
      content: String(req.body?.content ?? ''),
      parentReplyId: typeof req.body?.parentReply === 'string' ? req.body.parentReply : undefined,
    })

    return res.status(201).json(result)
  } catch (error) {
    console.error('Create community reply error:', error)
    return respondServiceError(res, error, 'Erro ao criar resposta da comunidade.')
  }
}

/**
 * POST /api/community/posts/:id/vote
 */
export const voteCommunityPost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const id = typeof req.params.id === 'string' ? req.params.id : ''
    const direction = req.body?.direction as CommunityVoteDirection
    const result = await communityThreadService.votePost(id, req.user, direction)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Vote community post error:', error)
    return respondServiceError(res, error, 'Erro ao processar voto no post.')
  }
}

/**
 * POST /api/community/replies/:id/vote
 */
export const voteCommunityReply = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const id = typeof req.params.id === 'string' ? req.params.id : ''
    const direction = req.body?.direction as CommunityVoteDirection
    const result = await communityThreadService.voteReply(id, req.user, direction)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Vote community reply error:', error)
    return respondServiceError(res, error, 'Erro ao processar voto na resposta.')
  }
}

/**
 * GET /api/community/me/xp
 */
export const getCommunityMyXp = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const result = await xpService.getMyXp(req.user.id)
    return res.status(200).json(result)
  } catch (error) {
    console.error('Get my community xp error:', error)
    const details = error instanceof Error ? error.message : undefined
    return res.status(500).json({
      error: 'Erro ao carregar progresso de XP.',
      details,
    })
  }
}

/**
 * GET /api/community/leaderboard
 */
export const getCommunityLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const result = await xpService.getWeeklyLeaderboard(req.user?.id)
    return res.status(200).json(result)
  } catch (error) {
    console.error('Get community leaderboard error:', error)
    const details = error instanceof Error ? error.message : undefined
    return res.status(500).json({
      error: 'Erro ao carregar leaderboard semanal.',
      details,
    })
  }
}
