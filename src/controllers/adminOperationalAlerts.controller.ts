import { Response } from 'express'
import {
  AdminOperationalAlertStateStatus,
  adminOperationalAlertsService,
} from '../services/adminOperationalAlerts.service'
import { AuthRequest } from '../types/auth'
import { readAdminReason } from '../utils/adminActionPayload'

const parsePositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false
  }
  return fallback
}

const parseAlertState = (value: unknown): AdminOperationalAlertStateStatus | 'all' => {
  if (value === 'open' || value === 'acknowledged' || value === 'dismissed') {
    return value
  }
  return 'all'
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

const extractAlertId = (req: AuthRequest): string => {
  const raw = typeof req.params.alertId === 'string' ? req.params.alertId : ''
  if (!raw) return ''

  try {
    return decodeURIComponent(raw).trim()
  } catch (_error) {
    return raw.trim()
  }
}

const ensureWritableAdmin = (req: AuthRequest, res: Response): boolean => {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticacao necessaria.' })
    return false
  }

  if (req.user.adminReadOnly) {
    res.status(403).json({
      error: 'Perfil admin em modo read-only nao pode alterar estado de alertas.',
    })
    return false
  }

  return true
}

/**
 * GET /api/admin/alerts/internal
 * Lista alertas internos para eventos administrativos criticos.
 */
export const listAdminInternalAlerts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const windowHours = parsePositiveInt(req.query.windowHours, 24)
    const limit = parsePositiveInt(req.query.limit, 50)
    const state = parseAlertState(req.query.state)
    const includeDismissed = parseBoolean(req.query.includeDismissed, false)

    const result = await adminOperationalAlertsService.listInternalAlerts({
      windowHours,
      limit,
      state,
      includeDismissed,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List admin operational alerts error:', error)
    return res.status(500).json({
      error: 'Erro ao listar alertas operacionais admin.',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}

/**
 * POST /api/admin/alerts/internal/:alertId/acknowledge
 */
export const acknowledgeAdminInternalAlert = async (req: AuthRequest, res: Response) => {
  try {
    if (!ensureWritableAdmin(req, res)) return

    const alertId = extractAlertId(req)
    if (!alertId) {
      return res.status(400).json({ error: 'Parametro alertId obrigatorio.' })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return

    const result = await adminOperationalAlertsService.setAlertState({
      alertId,
      state: 'acknowledged',
      actorId: req.user!.id,
      reason,
    })

    return res.status(200).json({
      message: 'Alerta marcado como acknowledged.',
      alert: result,
    })
  } catch (error: unknown) {
    console.error('Acknowledge admin operational alert error:', error)
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Erro ao atualizar estado do alerta.',
    })
  }
}

/**
 * POST /api/admin/alerts/internal/:alertId/dismiss
 */
export const dismissAdminInternalAlert = async (req: AuthRequest, res: Response) => {
  try {
    if (!ensureWritableAdmin(req, res)) return

    const alertId = extractAlertId(req)
    if (!alertId) {
      return res.status(400).json({ error: 'Parametro alertId obrigatorio.' })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return

    const result = await adminOperationalAlertsService.setAlertState({
      alertId,
      state: 'dismissed',
      actorId: req.user!.id,
      reason,
    })

    return res.status(200).json({
      message: 'Alerta marcado como dismissed.',
      alert: result,
    })
  } catch (error: unknown) {
    console.error('Dismiss admin operational alert error:', error)
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Erro ao atualizar estado do alerta.',
    })
  }
}
