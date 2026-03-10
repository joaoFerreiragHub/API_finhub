import { Request, Response } from 'express'
import {
  BrandIntegrationApiKeyServiceError,
  BrandIntegrationAuthContext,
  brandIntegrationApiKeyService,
} from '../services/brandIntegrationApiKey.service'

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

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const requireIntegrationContext = (res: Response): BrandIntegrationAuthContext | null => {
  const context = (res.locals as Record<string, unknown>).brandIntegration
  if (!context || typeof context !== 'object') return null
  return context as BrandIntegrationAuthContext
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof BrandIntegrationApiKeyServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

/**
 * GET /api/integrations/brand/affiliate/overview
 */
export const getBrandIntegrationAffiliateOverview = async (req: Request, res: Response) => {
  try {
    const context = requireIntegrationContext(res)
    if (!context) {
      return res.status(401).json({ error: 'Contexto de integracao em falta.' })
    }

    const daysRaw = req.query.days
    if (typeof daysRaw === 'string' && parseOptionalPositiveInt(daysRaw) === undefined) {
      return res.status(400).json({ error: 'Parametro days invalido.' })
    }

    const result = await brandIntegrationApiKeyService.getAffiliateOverviewFromIntegration(
      context,
      parseOptionalPositiveInt(daysRaw)
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get brand integration affiliate overview error:', error)
    return handleError(res, error, 'Erro ao obter overview de afiliacao via integracao.')
  }
}

/**
 * GET /api/integrations/brand/affiliate/links
 */
export const listBrandIntegrationAffiliateLinks = async (req: Request, res: Response) => {
  try {
    const context = requireIntegrationContext(res)
    if (!context) {
      return res.status(401).json({ error: 'Contexto de integracao em falta.' })
    }

    const isActiveRaw = req.query.isActive
    if (typeof isActiveRaw === 'string' && parseOptionalBoolean(isActiveRaw) === undefined) {
      return res.status(400).json({ error: 'Parametro isActive invalido.' })
    }

    const result = await brandIntegrationApiKeyService.listAffiliateLinksFromIntegration(context, {
      isActive: parseOptionalBoolean(isActiveRaw),
      search: toOptionalString(req.query.search),
      page: parseOptionalPositiveInt(req.query.page),
      limit: parseOptionalPositiveInt(req.query.limit),
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List brand integration affiliate links error:', error)
    return handleError(res, error, 'Erro ao listar links de afiliacao via integracao.')
  }
}

/**
 * GET /api/integrations/brand/affiliate/links/:linkId/clicks
 */
export const listBrandIntegrationAffiliateLinkClicks = async (req: Request, res: Response) => {
  try {
    const context = requireIntegrationContext(res)
    if (!context) {
      return res.status(401).json({ error: 'Contexto de integracao em falta.' })
    }

    const convertedRaw = req.query.converted
    if (typeof convertedRaw === 'string' && parseOptionalBoolean(convertedRaw) === undefined) {
      return res.status(400).json({ error: 'Parametro converted invalido.' })
    }

    const daysRaw = req.query.days
    if (typeof daysRaw === 'string' && parseOptionalPositiveInt(daysRaw) === undefined) {
      return res.status(400).json({ error: 'Parametro days invalido.' })
    }

    const result = await brandIntegrationApiKeyService.listAffiliateLinkClicksFromIntegration(
      context,
      req.params.linkId,
      {
        converted: parseOptionalBoolean(convertedRaw),
        days: parseOptionalPositiveInt(daysRaw),
        from: toOptionalString(req.query.from),
        to: toOptionalString(req.query.to),
        page: parseOptionalPositiveInt(req.query.page),
        limit: parseOptionalPositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List brand integration affiliate link clicks error:', error)
    return handleError(res, error, 'Erro ao listar cliques de afiliacao via integracao.')
  }
}
