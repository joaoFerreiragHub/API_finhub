import { NextFunction, Request, Response } from 'express'
import {
  BrandIntegrationApiKeyServiceError,
  brandIntegrationApiKeyService,
} from '../services/brandIntegrationApiKey.service'
import { BrandIntegrationScope } from '../models/BrandIntegrationApiKey'
import { logWarn } from '../utils/logger'

const extractApiKeyFromRequest = (req: Request): string | null => {
  const headerKeyRaw = req.headers['x-finhub-api-key']
  if (typeof headerKeyRaw === 'string' && headerKeyRaw.trim()) {
    return headerKeyRaw.trim()
  }

  const authHeader = req.headers.authorization
  if (typeof authHeader === 'string' && authHeader.trim()) {
    const trimmed = authHeader.trim()

    if (trimmed.toLowerCase().startsWith('apikey ')) {
      const token = trimmed.slice(7).trim()
      return token || null
    }

    if (trimmed.toLowerCase().startsWith('bearer ')) {
      const token = trimmed.slice(7).trim()
      return token || null
    }
  }

  return null
}

export const requireBrandIntegrationScope = (scope: BrandIntegrationScope) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = extractApiKeyFromRequest(req)
      if (!apiKey) {
        return res.status(401).json({
          error: 'API key obrigatoria. Usa header x-finhub-api-key.',
        })
      }

      const context = await brandIntegrationApiKeyService.authenticateApiKey(apiKey, scope)
      const startedAtMs = Date.now()
      res.once('finish', () => {
        void brandIntegrationApiKeyService
          .recordUsage({
            context,
            scope,
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAtMs,
            requestId: req.requestId ?? null,
            ip: req.ip ?? null,
            userAgent: req.get('user-agent') ?? null,
          })
          .catch((error) => {
            logWarn('brand_integration_api_usage_record_failed', {
              requestId: req.requestId,
              path: req.originalUrl || req.url,
              statusCode: res.statusCode,
              errorMessage: error instanceof Error ? error.message : String(error),
            })
          })
      })

      ;(res.locals as Record<string, unknown>).brandIntegration = context
      next()
    } catch (error: unknown) {
      if (error instanceof BrandIntegrationApiKeyServiceError) {
        return res.status(error.statusCode).json({
          error: error.message,
        })
      }

      return res.status(401).json({
        error: 'Falha ao autenticar API key de integracao.',
      })
    }
  }
}
