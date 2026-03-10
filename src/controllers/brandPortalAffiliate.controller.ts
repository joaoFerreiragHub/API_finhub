import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  AffiliateTrackingServiceError,
  affiliateTrackingService,
} from '../services/affiliateTracking.service'

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const parseOptionalPositiveInt = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }
  return undefined
}

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') return true
  if (normalized === 'false' || normalized === '0') return false
  return undefined
}

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AffiliateTrackingServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

const requireUserId = (req: AuthRequest, res: Response): string | null => {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticacao necessaria.' })
    return null
  }
  return req.user.id
}

/**
 * GET /api/brand-portal/affiliate-links
 */
export const listBrandPortalAffiliateLinks = async (req: AuthRequest, res: Response) => {
  try {
    const ownerUserId = requireUserId(req, res)
    if (!ownerUserId) return

    const isActiveRaw = req.query.isActive
    if (typeof isActiveRaw === 'string' && parseOptionalBoolean(isActiveRaw) === undefined) {
      return res.status(400).json({
        error: 'Parametro isActive invalido.',
      })
    }

    const result = await affiliateTrackingService.listOwnedLinks(
      ownerUserId,
      {
        directoryEntryId: toOptionalString(req.query.directoryEntryId),
        isActive: parseOptionalBoolean(req.query.isActive),
        search: toOptionalString(req.query.search),
      },
      {
        page: parseOptionalPositiveInt(req.query.page),
        limit: parseOptionalPositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List brand portal affiliate links error:', error)
    return handleError(res, error, 'Erro ao listar links de afiliacao.')
  }
}

/**
 * POST /api/brand-portal/affiliate-links
 */
export const createBrandPortalAffiliateLink = async (req: AuthRequest, res: Response) => {
  try {
    const ownerUserId = requireUserId(req, res)
    if (!ownerUserId) return

    const body = extractBodyRecord(req)
    const item = await affiliateTrackingService.createOwnedLink(ownerUserId, body)

    return res.status(201).json({
      message: 'Link de afiliacao criado com sucesso.',
      item,
    })
  } catch (error: unknown) {
    console.error('Create brand portal affiliate link error:', error)
    return handleError(res, error, 'Erro ao criar link de afiliacao.')
  }
}

/**
 * PATCH /api/brand-portal/affiliate-links/:linkId
 */
export const updateBrandPortalAffiliateLink = async (req: AuthRequest, res: Response) => {
  try {
    const ownerUserId = requireUserId(req, res)
    if (!ownerUserId) return

    const body = extractBodyRecord(req)
    const patch =
      body.patch && typeof body.patch === 'object' && !Array.isArray(body.patch)
        ? (body.patch as Record<string, unknown>)
        : body

    const item = await affiliateTrackingService.updateOwnedLink(ownerUserId, req.params.linkId, patch)

    return res.status(200).json({
      message: 'Link de afiliacao atualizado com sucesso.',
      item,
    })
  } catch (error: unknown) {
    console.error('Update brand portal affiliate link error:', error)
    return handleError(res, error, 'Erro ao atualizar link de afiliacao.')
  }
}

/**
 * GET /api/brand-portal/affiliate-links/:linkId/clicks
 */
export const listBrandPortalAffiliateLinkClicks = async (req: AuthRequest, res: Response) => {
  try {
    const ownerUserId = requireUserId(req, res)
    if (!ownerUserId) return

    const convertedRaw = req.query.converted
    if (typeof convertedRaw === 'string' && parseOptionalBoolean(convertedRaw) === undefined) {
      return res.status(400).json({
        error: 'Parametro converted invalido.',
      })
    }

    const daysRaw = req.query.days
    if (typeof daysRaw === 'string' && parseOptionalPositiveInt(daysRaw) === undefined) {
      return res.status(400).json({
        error: 'Parametro days invalido.',
      })
    }

    const result = await affiliateTrackingService.listOwnedLinkClicks(
      ownerUserId,
      req.params.linkId,
      {
        converted: parseOptionalBoolean(convertedRaw),
        days: parseOptionalPositiveInt(daysRaw),
        from: toOptionalString(req.query.from),
        to: toOptionalString(req.query.to),
      },
      {
        page: parseOptionalPositiveInt(req.query.page),
        limit: parseOptionalPositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List brand portal affiliate link clicks error:', error)
    return handleError(res, error, 'Erro ao listar cliques do link de afiliacao.')
  }
}
