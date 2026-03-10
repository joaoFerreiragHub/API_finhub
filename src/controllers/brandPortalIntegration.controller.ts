import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  BrandIntegrationApiKeyServiceError,
  brandIntegrationApiKeyService,
} from '../services/brandIntegrationApiKey.service'

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') return true
  if (normalized === 'false' || normalized === '0') return false
  return undefined
}

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

const parseOptionalInt = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
}

const requireUserId = (req: AuthRequest, res: Response): string | null => {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticacao necessaria.' })
    return null
  }
  return req.user.id
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
 * GET /api/brand-portal/integrations/api-keys
 */
export const listBrandPortalIntegrationApiKeys = async (req: AuthRequest, res: Response) => {
  try {
    const ownerUserId = requireUserId(req, res)
    if (!ownerUserId) return

    const isActiveRaw = req.query.isActive
    if (typeof isActiveRaw === 'string' && parseOptionalBoolean(isActiveRaw) === undefined) {
      return res.status(400).json({
        error: 'Parametro isActive invalido.',
      })
    }

    const result = await brandIntegrationApiKeyService.listOwnedApiKeys(
      ownerUserId,
      {
        directoryEntryId: toOptionalString(req.query.directoryEntryId),
        isActive: parseOptionalBoolean(isActiveRaw),
      },
      {
        page: parseOptionalPositiveInt(req.query.page),
        limit: parseOptionalPositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List brand portal integration api keys error:', error)
    return handleError(res, error, 'Erro ao listar API keys de integracao.')
  }
}

/**
 * POST /api/brand-portal/integrations/api-keys
 */
export const createBrandPortalIntegrationApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const ownerUserId = requireUserId(req, res)
    if (!ownerUserId) return

    const body = extractBodyRecord(req)
    const result = await brandIntegrationApiKeyService.createOwnedApiKey(ownerUserId, {
      directoryEntryId: body.directoryEntryId,
      label: body.label,
      scopes: body.scopes,
      expiresAt: body.expiresAt,
      metadata: body.metadata,
    })

    return res.status(201).json({
      message: 'API key de integracao criada com sucesso.',
      item: result.item,
      apiKey: result.apiKey,
      warning: 'Guarda esta API key agora. O valor completo nao sera mostrado novamente.',
    })
  } catch (error: unknown) {
    console.error('Create brand portal integration api key error:', error)
    return handleError(res, error, 'Erro ao criar API key de integracao.')
  }
}

/**
 * POST /api/brand-portal/integrations/api-keys/:keyId/revoke
 */
export const revokeBrandPortalIntegrationApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const ownerUserId = requireUserId(req, res)
    if (!ownerUserId) return

    const item = await brandIntegrationApiKeyService.revokeOwnedApiKey(ownerUserId, req.params.keyId)
    return res.status(200).json({
      message: 'API key de integracao revogada com sucesso.',
      item,
    })
  } catch (error: unknown) {
    console.error('Revoke brand portal integration api key error:', error)
    return handleError(res, error, 'Erro ao revogar API key de integracao.')
  }
}

/**
 * GET /api/brand-portal/integrations/api-keys/:keyId/usage
 */
export const listBrandPortalIntegrationApiKeyUsage = async (req: AuthRequest, res: Response) => {
  try {
    const ownerUserId = requireUserId(req, res)
    if (!ownerUserId) return

    const daysRaw = req.query.days
    if (typeof daysRaw === 'string' && parseOptionalPositiveInt(daysRaw) === undefined) {
      return res.status(400).json({ error: 'Parametro days invalido.' })
    }

    const statusCodeFrom = parseOptionalInt(req.query.statusCodeFrom)
    const statusCodeTo = parseOptionalInt(req.query.statusCodeTo)
    if (typeof req.query.statusCodeFrom === 'string' && statusCodeFrom === undefined) {
      return res.status(400).json({ error: 'Parametro statusCodeFrom invalido.' })
    }
    if (typeof req.query.statusCodeTo === 'string' && statusCodeTo === undefined) {
      return res.status(400).json({ error: 'Parametro statusCodeTo invalido.' })
    }

    const result = await brandIntegrationApiKeyService.listOwnedApiKeyUsage(
      ownerUserId,
      req.params.keyId,
      {
        days: parseOptionalPositiveInt(req.query.days),
        method: toOptionalString(req.query.method),
        statusCodeFrom,
        statusCodeTo,
      },
      {
        page: parseOptionalPositiveInt(req.query.page),
        limit: parseOptionalPositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List brand portal integration api key usage error:', error)
    return handleError(res, error, 'Erro ao listar usage da API key de integracao.')
  }
}
