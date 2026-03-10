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
