import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  isValidSurfaceControlKey,
  surfaceControlService,
  SurfaceControlServiceError,
} from '../services/surfaceControl.service'
import {
  readAdminNote,
  readAdminPublicMessage,
  readAdminReason,
} from '../utils/adminActionPayload'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_surface_control_controller'

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> | undefined => {
  const body = req.body
  if (!body || typeof body !== 'object') return undefined
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

const resolvePublicMessage = (req: AuthRequest, res: Response): string | undefined | null => {
  const parsed = readAdminPublicMessage(req)
  if (parsed.error) {
    res.status(400).json({
      error: parsed.error,
    })
    return null
  }
  return parsed.value
}

const handleSurfaceControlError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof SurfaceControlServiceError) {
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
 * GET /api/admin/platform/surfaces
 */
export const listAdminSurfaceControls = async (req: AuthRequest, res: Response) => {
  try {
    const result = await surfaceControlService.listControls()
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_surface_controls', error, req)
    return handleSurfaceControlError(res, error, 'Erro ao listar kill switches de superficie.')
  }
}

/**
 * POST /api/admin/platform/surfaces/:surfaceKey
 */
export const updateAdminSurfaceControl = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const surfaceKey = req.params.surfaceKey
    if (!isValidSurfaceControlKey(surfaceKey)) {
      return res.status(400).json({
        error: 'Parametro surfaceKey invalido.',
      })
    }

    const body = extractBodyRecord(req)
    const enabled = body?.enabled
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Campo enabled obrigatorio.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para atualizar kill switch.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const publicMessage = resolvePublicMessage(req, res)
    if (publicMessage === null) return

    const result = await surfaceControlService.updateControl({
      actorId: req.user.id,
      key: surfaceKey,
      enabled,
      reason,
      note,
      publicMessage,
    })

    return res.status(200).json({
      message: enabled
        ? 'Superficie reativada com sucesso.'
        : 'Kill switch de superficie ativado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_admin_surface_control', error, req)
    return handleSurfaceControlError(res, error, 'Erro ao atualizar kill switch de superficie.')
  }
}
