import crypto from 'crypto'
import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  AffiliateTrackingServiceError,
  affiliateTrackingService,
} from '../services/affiliateTracking.service'

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

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
}

const extractPostbackSecretFromRequest = (req: AuthRequest): string | null => {
  const customHeader = req.get('x-affiliate-postback-secret')
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim()
  }

  const authHeader = req.get('authorization')
  if (typeof authHeader !== 'string' || !authHeader.trim()) {
    return null
  }

  const normalized = authHeader.trim()
  const normalizedLower = normalized.toLowerCase()

  if (normalizedLower.startsWith('bearer ')) {
    const token = normalized.slice(7).trim()
    return token || null
  }

  if (normalizedLower.startsWith('apikey ')) {
    const token = normalized.slice(7).trim()
    return token || null
  }

  return null
}

const isSecretMatch = (provided: string, expected: string): boolean => {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

/**
 * GET /api/affiliates/r/:code
 */
export const redirectAffiliateLink = async (req: AuthRequest, res: Response) => {
  try {
    const result = await affiliateTrackingService.resolveAndTrackRedirect({
      code: req.params.code,
      visitorUserId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
      referrer: req.get('referer') ?? req.get('referrer') ?? null,
      utmSource: typeof req.query.utm_source === 'string' ? req.query.utm_source : null,
      utmMedium: typeof req.query.utm_medium === 'string' ? req.query.utm_medium : null,
      utmCampaign: typeof req.query.utm_campaign === 'string' ? req.query.utm_campaign : null,
      utmTerm: typeof req.query.utm_term === 'string' ? req.query.utm_term : null,
      utmContent: typeof req.query.utm_content === 'string' ? req.query.utm_content : null,
    })

    return res.redirect(302, result.redirectUrl)
  } catch (error: unknown) {
    console.error('Redirect affiliate link error:', error)
    return handleError(res, error, 'Erro ao processar redirect de afiliacao.')
  }
}

/**
 * POST /api/affiliates/postback/conversion
 */
export const registerAffiliatePostbackConversion = async (req: AuthRequest, res: Response) => {
  try {
    const expectedSecret = (process.env.AFFILIATE_POSTBACK_SECRET ?? '').trim()
    if (!expectedSecret) {
      return res.status(503).json({
        error: 'Postback de afiliacao desativado. Configura AFFILIATE_POSTBACK_SECRET.',
      })
    }

    const providedSecret = extractPostbackSecretFromRequest(req)
    if (!providedSecret || !isSecretMatch(providedSecret, expectedSecret)) {
      return res.status(401).json({ error: 'Credenciais de postback invalidas.' })
    }

    const body = extractBodyRecord(req)
    const result = await affiliateTrackingService.markClickConversionFromPostback({
      clickId: body.clickId,
      valueCents: body.valueCents,
      value: body.value,
      currency: body.currency,
      reference: body.reference,
      provider: body.provider,
      metadata: body.metadata,
      force: body.force,
    })

    return res.status(200).json({
      message: result.updated
        ? 'Conversao de afiliacao registada via postback.'
        : 'Clique ja estava convertido. Sem alteracoes.',
      ...result,
    })
  } catch (error: unknown) {
    console.error('Register affiliate postback conversion error:', error)
    return handleError(res, error, 'Erro ao registar conversao de afiliacao via postback.')
  }
}
