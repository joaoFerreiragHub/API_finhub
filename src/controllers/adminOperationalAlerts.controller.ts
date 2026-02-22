import { Response } from 'express'
import { adminOperationalAlertsService } from '../services/adminOperationalAlerts.service'
import { AuthRequest } from '../types/auth'

const parsePositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
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

    const result = await adminOperationalAlertsService.listInternalAlerts({
      windowHours,
      limit,
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

