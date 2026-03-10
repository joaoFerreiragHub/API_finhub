import { NextFunction, Request, Response } from 'express'
import {
  BrandIntegrationApiKeyServiceError,
  brandIntegrationApiKeyService,
} from '../services/brandIntegrationApiKey.service'
import { BrandIntegrationScope } from '../models/BrandIntegrationApiKey'

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
