import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import {
  isValidPlatformIntegrationKey,
  platformIntegrationConfigService,
  PlatformIntegrationConfigServiceError,
} from '../services/platformIntegrationConfig.service'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_platform_integration_controller'

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> | undefined => {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined
  return body as Record<string, unknown>
}

const resolveReason = (req: AuthRequest, res: Response): string | undefined | null => {
  const parsed = readAdminReason(req)
  if (parsed.error) {
    res.status(400).json({
      error: parsed.error,
    })
    return null
  }
  return parsed.value
}

const resolveNote = (req: AuthRequest, res: Response): string | undefined | null => {
  const parsed = readAdminNote(req)
  if (parsed.error) {
    res.status(400).json({
      error: parsed.error,
    })
    return null
  }
  return parsed.value
}

const handleIntegrationError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof PlatformIntegrationConfigServiceError) {
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
 * GET /api/admin/platform/integrations
 */
export const listAdminPlatformIntegrations = async (req: AuthRequest, res: Response) => {
  try {
    const result = await platformIntegrationConfigService.listIntegrations()
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_platform_integrations', error, req)
    return handleIntegrationError(res, error, 'Erro ao listar integracoes de plataforma.')
  }
}

/**
 * PATCH /api/admin/platform/integrations/:integrationKey
 */
export const updateAdminPlatformIntegration = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const integrationKey = req.params.integrationKey
    if (!isValidPlatformIntegrationKey(integrationKey)) {
      return res.status(400).json({
        error: 'Parametro integrationKey invalido.',
      })
    }

    const body = extractBodyRecord(req)
    const enabled = body?.enabled
    if (typeof enabled !== 'undefined' && typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Campo enabled invalido (boolean).',
      })
    }

    const config = body?.config
    if (
      typeof config !== 'undefined' &&
      (!config || typeof config !== 'object' || Array.isArray(config))
    ) {
      return res.status(400).json({
        error: 'Campo config invalido.',
      })
    }

    if (typeof enabled === 'undefined' && typeof config === 'undefined') {
      return res.status(400).json({
        error: 'Envia pelo menos enabled ou config para atualizar integracao.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para atualizar integracao.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await platformIntegrationConfigService.updateIntegration({
      actorId: req.user.id,
      key: integrationKey,
      enabled,
      config: config as Record<string, unknown> | undefined,
      reason,
      note,
    })

    return res.status(200).json({
      message: 'Integracao de plataforma atualizada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_admin_platform_integration', error, req)
    return handleIntegrationError(res, error, 'Erro ao atualizar integracao de plataforma.')
  }
}

/**
 * POST /api/admin/platform/integrations/:integrationKey/rollback
 */
export const rollbackAdminPlatformIntegration = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const integrationKey = req.params.integrationKey
    if (!isValidPlatformIntegrationKey(integrationKey)) {
      return res.status(400).json({
        error: 'Parametro integrationKey invalido.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para rollback de integracao.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await platformIntegrationConfigService.rollbackIntegration({
      actorId: req.user.id,
      key: integrationKey,
      reason,
      note,
    })

    return res.status(200).json({
      message: 'Rollback da integracao executado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'rollback_admin_platform_integration', error, req)
    return handleIntegrationError(res, error, 'Erro ao executar rollback da integracao de plataforma.')
  }
}
