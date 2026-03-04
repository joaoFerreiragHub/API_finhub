import { Response } from 'express'
import { adminAuditService, AdminAuditFilters } from '../services/adminAudit.service'
import { AuthRequest } from '../types/auth'

const parsePositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const parseIsoDate = (value: unknown): Date | undefined | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const extractFilters = (req: AuthRequest): { filters?: AdminAuditFilters; error?: string } => {
  const from = parseIsoDate(req.query.from)
  if (from === null) {
    return { error: 'Parametro from invalido. Usa formato ISO (ex: 2026-03-01T00:00:00.000Z).' }
  }

  const to = parseIsoDate(req.query.to)
  if (to === null) {
    return { error: 'Parametro to invalido. Usa formato ISO (ex: 2026-03-04T23:59:59.999Z).' }
  }

  if (from && to && from.getTime() > to.getTime()) {
    return { error: 'Intervalo invalido: from nao pode ser maior que to.' }
  }

  return {
    filters: {
      actorId: req.query.actorId as string | undefined,
      action: req.query.action as string | undefined,
      resourceType: req.query.resourceType as string | undefined,
      outcome: req.query.outcome as 'success' | 'forbidden' | 'error' | undefined,
      requestId: req.query.requestId as string | undefined,
      from,
      to,
    },
  }
}

const toIsoDate = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }
  return ''
}

const toCsvSafeValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  try {
    return JSON.stringify(value)
  } catch (_error) {
    return ''
  }
}

const escapeCsv = (value: string): string => `"${value.replace(/"/g, '""')}"`

const asActorRecord = (
  actor: unknown
): {
  id: string
  name: string
  username: string
  email: string
  role: string
} => {
  if (!actor || typeof actor !== 'object') {
    return { id: '', name: '', username: '', email: '', role: '' }
  }

  const actorRecord = actor as Record<string, unknown>
  const id = toCsvSafeValue(actorRecord._id ?? actorRecord.id)
  const name = toCsvSafeValue(actorRecord.name)
  const username = toCsvSafeValue(actorRecord.username)
  const email = toCsvSafeValue(actorRecord.email)
  const role = toCsvSafeValue(actorRecord.role)

  return { id, name, username, email, role }
}

/**
 * Listar logs de auditoria admin
 * GET /api/admin/audit-logs
 */
export const listAdminAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const { filters, error } = extractFilters(req)
    if (error) {
      return res.status(400).json({ error })
    }

    const page = parsePositiveInt(req.query.page, 1)
    const rawLimit = parsePositiveInt(req.query.limit, 50)
    const limit = Math.min(rawLimit, 100)

    const result = await adminAuditService.list(filters, { page, limit })
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List admin audit logs error:', error)
    return res.status(500).json({
      error: 'Erro ao listar logs de auditoria admin.',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}

/**
 * Exportar logs de auditoria admin em CSV
 * GET /api/admin/audit-logs/export.csv
 */
export const exportAdminAuditLogsCsv = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const { filters, error } = extractFilters(req)
    if (error) {
      return res.status(400).json({ error })
    }

    const rawMaxRows = parsePositiveInt(req.query.maxRows, 2000)
    const maxRows = Math.min(rawMaxRows, 5000)
    const rows = await adminAuditService.listForExport(filters, { limit: maxRows })

    const headers = [
      'createdAt',
      'actorId',
      'actorName',
      'actorUsername',
      'actorEmail',
      'actorRole',
      'action',
      'scope',
      'resourceType',
      'resourceId',
      'outcome',
      'statusCode',
      'method',
      'path',
      'reason',
      'requestId',
      'ip',
      'userAgent',
      'metadata',
    ]

    const csvLines = [headers.join(',')]
    for (const row of rows) {
      const actor = asActorRecord((row as any).actor)
      const values = [
        toIsoDate((row as any).createdAt),
        actor.id,
        actor.name,
        actor.username,
        actor.email,
        actor.role,
        toCsvSafeValue((row as any).action),
        toCsvSafeValue((row as any).scope),
        toCsvSafeValue((row as any).resourceType),
        toCsvSafeValue((row as any).resourceId),
        toCsvSafeValue((row as any).outcome),
        toCsvSafeValue((row as any).statusCode),
        toCsvSafeValue((row as any).method),
        toCsvSafeValue((row as any).path),
        toCsvSafeValue((row as any).reason),
        toCsvSafeValue((row as any).requestId),
        toCsvSafeValue((row as any).ip),
        toCsvSafeValue((row as any).userAgent),
        toCsvSafeValue((row as any).metadata),
      ]

      csvLines.push(values.map((value) => escapeCsv(value)).join(','))
    }

    const filename = `admin-audit-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(200).send(csvLines.join('\n'))
  } catch (error: unknown) {
    console.error('Export admin audit logs csv error:', error)
    return res.status(500).json({
      error: 'Erro ao exportar logs de auditoria admin.',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
