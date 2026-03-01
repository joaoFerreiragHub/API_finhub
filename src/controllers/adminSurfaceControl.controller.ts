import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  isValidSurfaceControlKey,
  surfaceControlService,
  SurfaceControlServiceError,
} from '../services/surfaceControl.service'

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> | undefined => {
  const body = req.body
  if (!body || typeof body !== 'object') return undefined
  return body as Record<string, unknown>
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
export const listAdminSurfaceControls = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await surfaceControlService.listControls()
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List admin surface controls error:', error)
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

    const reason = typeof body?.reason === 'string' ? body.reason : ''
    if (!reason.trim()) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para atualizar kill switch.',
      })
    }

    const result = await surfaceControlService.updateControl({
      actorId: req.user.id,
      key: surfaceKey,
      enabled,
      reason,
      note: typeof body?.note === 'string' ? body.note : undefined,
      publicMessage: typeof body?.publicMessage === 'string' ? body.publicMessage : undefined,
    })

    return res.status(200).json({
      message: enabled
        ? 'Superficie reativada com sucesso.'
        : 'Kill switch de superficie ativado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    console.error('Update admin surface control error:', error)
    return handleSurfaceControlError(res, error, 'Erro ao atualizar kill switch de superficie.')
  }
}
