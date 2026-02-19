import { Response } from 'express'
import { adminAuditService } from '../services/adminAudit.service'
import { AuthRequest } from '../types/auth'

const parsePositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

/**
 * Listar logs de auditoria admin
 * GET /api/admin/audit-logs
 */
export const listAdminAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const page = parsePositiveInt(req.query.page, 1)
    const rawLimit = parsePositiveInt(req.query.limit, 50)
    const limit = Math.min(rawLimit, 100)

    const result = await adminAuditService.list(
      {
        actorId: req.query.actorId as string | undefined,
        action: req.query.action as string | undefined,
        resourceType: req.query.resourceType as string | undefined,
        outcome: req.query.outcome as 'success' | 'forbidden' | 'error' | undefined,
        requestId: req.query.requestId as string | undefined,
      },
      { page, limit }
    )

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List admin audit logs error:', error)
    return res.status(500).json({
      error: 'Erro ao listar logs de auditoria admin',
      details: error.message,
    })
  }
}
