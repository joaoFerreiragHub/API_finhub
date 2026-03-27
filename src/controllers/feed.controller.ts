import { Response } from 'express'
import { feedService } from '../services/feed.service'
import { AuthRequest } from '../types/auth'
import { buildInternalErrorPayload } from '../utils/httpError'

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value !== 'string') return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

/**
 * GET /api/feed
 */
export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    const followingQuery = parseBoolean(req.query.following)

    const result = await feedService.getFeed(req.user.id, {
      page: parsePositiveInt(req.query.page),
      limit: parsePositiveInt(req.query.limit),
      following: followingQuery === undefined ? true : followingQuery,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get feed error:', error)
    return res.status(500).json(buildInternalErrorPayload('Erro ao obter feed.', error))
  }
}
