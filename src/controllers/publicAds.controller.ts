import { Request, Response } from 'express'
import {
  isValidAdAudience,
  isValidAdDevice,
  PublicAdsServiceError,
  publicAdsService,
} from '../services/publicAds.service'

const parseBody = (req: Request): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
}

const detectDeviceFromUserAgent = (userAgent: string): 'mobile' | 'desktop' => {
  if (/android|iphone|ipad|ipod|mobile|opera mini|iemobile/i.test(userAgent)) {
    return 'mobile'
  }
  return 'desktop'
}

const extractSessionKey = (req: Request): string => {
  const querySession = typeof req.query.session === 'string' ? req.query.session.trim() : ''
  const headerSession = typeof req.headers['x-finhub-session'] === 'string'
    ? req.headers['x-finhub-session'].trim()
    : ''

  if (querySession) return querySession
  if (headerSession) return headerSession

  const ip = typeof req.ip === 'string' && req.ip.trim() ? req.ip.trim() : 'unknown'
  return `ip:${ip}`
}

const handleAdsError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof PublicAdsServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  const details = error instanceof Error ? error.message : undefined
  return res.status(500).json({
    error: fallbackMessage,
    details,
  })
}

/**
 * GET /api/ads/serve
 */
export const servePublicAd = async (req: Request, res: Response) => {
  try {
    const slot = typeof req.query.slot === 'string' ? req.query.slot.trim() : ''
    if (!slot) {
      return res.status(400).json({
        error: 'Parametro slot obrigatorio.',
      })
    }

    const audienceRaw = typeof req.query.audience === 'string' ? req.query.audience : 'free'
    if (!isValidAdAudience(audienceRaw)) {
      return res.status(400).json({
        error: 'Parametro audience invalido. Usa free ou premium.',
      })
    }

    const deviceRaw =
      typeof req.query.device === 'string'
        ? req.query.device
        : detectDeviceFromUserAgent(req.headers['user-agent'] ?? '')
    if (!isValidAdDevice(deviceRaw)) {
      return res.status(400).json({
        error: 'Parametro device invalido. Usa desktop, mobile ou all.',
      })
    }

    const result = await publicAdsService.serveAd({
      slot,
      audience: audienceRaw,
      device: deviceRaw,
      sessionKey: extractSessionKey(req),
      country: typeof req.query.country === 'string' ? req.query.country : null,
      vertical: typeof req.query.vertical === 'string' ? req.query.vertical : null,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Serve public ad error:', error)
    return handleAdsError(res, error, 'Erro ao selecionar anuncio para o slot.')
  }
}

/**
 * POST /api/ads/impression
 */
export const trackPublicAdImpression = async (req: Request, res: Response) => {
  try {
    const body = parseBody(req)
    const token = typeof body.token === 'string' ? body.token : ''
    if (!token.trim()) {
      return res.status(400).json({
        error: 'Campo token obrigatorio.',
      })
    }

    const result = await publicAdsService.trackImpression({ token })
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Track public ad impression error:', error)
    return handleAdsError(res, error, 'Erro ao registar impressao de anuncio.')
  }
}

/**
 * POST /api/ads/click
 */
export const trackPublicAdClick = async (req: Request, res: Response) => {
  try {
    const body = parseBody(req)
    const token = typeof body.token === 'string' ? body.token : ''
    if (!token.trim()) {
      return res.status(400).json({
        error: 'Campo token obrigatorio.',
      })
    }

    const result = await publicAdsService.trackClick({ token })
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Track public ad click error:', error)
    return handleAdsError(res, error, 'Erro ao registar clique de anuncio.')
  }
}

