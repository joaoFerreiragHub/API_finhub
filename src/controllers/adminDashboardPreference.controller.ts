import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import {
  AdminDashboardPreferenceServiceError,
  adminDashboardPreferenceService,
} from '../services/adminDashboardPreference.service'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_dashboard_preference_controller'

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminDashboardPreferenceServiceError) {
    return res.status(error.statusCode).json({ error: error.message })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

/**
 * GET /api/admin/dashboard/personalization
 */
export const getAdminDashboardPersonalization = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const result = await adminDashboardPreferenceService.getPreference({
      id: req.user.id,
      role: req.user.role,
      adminScopes: req.user.adminScopes,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_dashboard_personalization', error, req)
    return handleError(res, error, 'Erro ao obter personalizacao do dashboard admin.')
  }
}

/**
 * PATCH /api/admin/dashboard/personalization
 */
export const updateAdminDashboardPersonalization = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const reason = readAdminReason(req)
    if (reason.error) {
      return res.status(400).json({ error: reason.error })
    }
    const note = readAdminNote(req)
    if (note.error) {
      return res.status(400).json({ error: note.error })
    }

    const result = await adminDashboardPreferenceService.updatePreference(
      {
        id: req.user.id,
        role: req.user.role,
        adminScopes: req.user.adminScopes,
      },
      extractBodyRecord(req),
      reason.value,
      note.value
    )

    return res.status(200).json({
      message: 'Personalizacao do dashboard atualizada com sucesso.',
      ...result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_admin_dashboard_personalization', error, req)
    return handleError(res, error, 'Erro ao atualizar personalizacao do dashboard admin.')
  }
}

/**
 * POST /api/admin/dashboard/personalization/reset
 */
export const resetAdminDashboardPersonalization = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const reason = readAdminReason(req)
    if (reason.error) {
      return res.status(400).json({ error: reason.error })
    }
    const note = readAdminNote(req)
    if (note.error) {
      return res.status(400).json({ error: note.error })
    }

    const body = extractBodyRecord(req)
    const result = await adminDashboardPreferenceService.resetPreference(
      {
        id: req.user.id,
        role: req.user.role,
        adminScopes: req.user.adminScopes,
      },
      body.preset,
      reason.value,
      note.value
    )

    return res.status(200).json({
      message: 'Dashboard admin reposto para configuracao base.',
      ...result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'reset_admin_dashboard_personalization', error, req)
    return handleError(res, error, 'Erro ao repor dashboard admin.')
  }
}
