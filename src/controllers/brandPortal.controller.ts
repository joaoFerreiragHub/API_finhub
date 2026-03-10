import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { BrandPortalServiceError, brandPortalService } from '../services/brandPortal.service'

const parseOptionalPositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

/**
 * GET /api/brand-portal/overview
 */
export const getBrandPortalOverview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const daysRaw = req.query.days
    if (typeof daysRaw === 'string' && parseOptionalPositiveInt(daysRaw) === undefined) {
      return res.status(400).json({
        error: 'Parametro days invalido.',
      })
    }

    const result = await brandPortalService.getOverview(req.user.id, parseOptionalPositiveInt(daysRaw))
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get brand portal overview error:', error)

    if (error instanceof BrandPortalServiceError) {
      return res.status(error.statusCode).json({
        error: error.message,
      })
    }

    const details = error instanceof Error ? error.message : undefined
    return res.status(500).json({
      error: 'Erro ao carregar overview do portal de marca.',
      details,
    })
  }
}

