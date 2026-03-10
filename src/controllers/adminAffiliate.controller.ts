import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  AffiliateTrackingServiceError,
  affiliateTrackingService,
} from '../services/affiliateTracking.service'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_affiliate_controller'

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const parseOptionalPositiveInt = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
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
    return res.status(error.statusCode).json({ error: error.message })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

/**
 * GET /api/admin/monetization/affiliates/overview
 */
export const getAdminAffiliateOverview = async (req: AuthRequest, res: Response) => {
  try {
    const daysRaw = req.query.days
    if (typeof daysRaw === 'string' && parseOptionalPositiveInt(daysRaw) === undefined) {
      return res.status(400).json({ error: 'Parametro days invalido.' })
    }

    const result = await affiliateTrackingService.getAdminOverview({
      days: parseOptionalPositiveInt(daysRaw),
      ownerUserId: toOptionalString(req.query.ownerUserId),
      directoryEntryId: toOptionalString(req.query.directoryEntryId),
      code: toOptionalString(req.query.code),
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_affiliate_overview', error, req)
    return handleError(res, error, 'Erro ao obter overview de afiliacao.')
  }
}

/**
 * GET /api/admin/monetization/affiliates/links
 */
export const listAdminAffiliateLinks = async (req: AuthRequest, res: Response) => {
  try {
    const isActiveRaw = req.query.isActive
    if (typeof isActiveRaw === 'string' && parseOptionalBoolean(isActiveRaw) === undefined) {
      return res.status(400).json({ error: 'Parametro isActive invalido.' })
    }

    const result = await affiliateTrackingService.listAdminLinks(
      {
        ownerUserId: toOptionalString(req.query.ownerUserId),
        directoryEntryId: toOptionalString(req.query.directoryEntryId),
        isActive: parseOptionalBoolean(isActiveRaw),
        search: toOptionalString(req.query.search),
      },
      {
        page: parseOptionalPositiveInt(req.query.page),
        limit: parseOptionalPositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_affiliate_links', error, req)
    return handleError(res, error, 'Erro ao listar links de afiliacao no admin.')
  }
}

/**
 * POST /api/admin/monetization/affiliates/clicks/:clickId/convert
 */
export const markAdminAffiliateClickConversion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = extractBodyRecord(req)
    const result = await affiliateTrackingService.markClickConversion(req.user.id, req.params.clickId, {
      valueCents: body.valueCents,
      value: body.value,
      currency: body.currency,
      reference: body.reference,
      metadata: body.metadata,
      force: body.force,
    })

    return res.status(200).json({
      message: result.updated
        ? 'Conversao de afiliacao marcada com sucesso.'
        : 'Clique ja estava convertido. Sem alteracoes.',
      ...result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'mark_admin_affiliate_click_conversion', error, req)
    return handleError(res, error, 'Erro ao marcar conversao de afiliacao.')
  }
}
