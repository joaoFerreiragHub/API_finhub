import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { recommendationService } from '../services/recommendation.service'
import { userPreferenceService } from '../services/userPreference.service'
import { resolveTargetMetadata } from '../services/social/targetMetadata.service'
import { xpService } from '../services/xp.service'

type RecommendationSignal =
  | 'content_viewed'
  | 'content_completed'
  | 'content_favorited'
  | 'not_interested'

const SIGNAL_WEIGHT: Record<RecommendationSignal, number> = {
  content_viewed: 0.5,
  content_completed: 1,
  content_favorited: 1.5,
  not_interested: -2,
}

const parseQueryString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

const parseLimitQuery = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}

/**
 * GET /api/recommendations
 */
export const getRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const requestedUserId = parseQueryString(req.query.userId)
    if (requestedUserId && requestedUserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Sem permissao para obter recomendacoes de outro utilizador.',
      })
    }

    const userId = requestedUserId || req.user.id
    const limit = parseLimitQuery(req.query.limit)

    const recommendations = await recommendationService.getRecommendations(userId, { limit })
    return res.status(200).json(recommendations)
  } catch (error: any) {
    console.error('Get recommendations error:', error)
    return res.status(500).json({
      error: 'Erro ao obter recomendacoes.',
      details: error.message,
    })
  }
}

/**
 * POST /api/user/signals
 */
export const postRecommendationSignal = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const payload = req.body as {
      signal: RecommendationSignal
      contentId: string
      contentType: 'article' | 'video' | 'course'
    }

    const signal = payload.signal
    const metadata = await resolveTargetMetadata(payload.contentType, payload.contentId)
    if (!metadata.ownerId) {
      return res.status(404).json({
        error: 'Conteudo nao encontrado para registar sinal.',
      })
    }

    await userPreferenceService.trackInteraction({
      userId: req.user.id,
      interactionType: signal,
      targetType: payload.contentType,
      targetId: payload.contentId,
      tags: metadata.tags,
      weight: SIGNAL_WEIGHT[signal],
    })

    if (signal === 'content_completed') {
      try {
        if (payload.contentType === 'article') {
          await xpService.awardXp(req.user.id, 'article_completed', undefined, {
            contentId: `article:${payload.contentId}`,
          })
        } else if (payload.contentType === 'course') {
          await xpService.awardXp(req.user.id, 'course_completed', undefined, {
            contentId: `course:${payload.contentId}`,
          })
        }
      } catch (xpError) {
        console.error('Award XP on content_completed error:', xpError)
      }
    }

    return res.status(200).json({
      success: true,
      signal,
      contentId: payload.contentId,
      contentType: payload.contentType,
    })
  } catch (error: any) {
    console.error('Post recommendation signal error:', error)
    return res.status(500).json({
      error: 'Erro ao registar sinal de recomendacao.',
      details: error.message,
    })
  }
}
