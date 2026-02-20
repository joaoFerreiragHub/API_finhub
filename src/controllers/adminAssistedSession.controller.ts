import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  AssistedSessionServiceError,
  assistedSessionService,
} from '../services/assistedSession.service'
import { assistedSessionAuditService } from '../services/assistedSessionAudit.service'
import { AssistedSessionStatus } from '../models/AssistedSession'

const VALID_STATUSES = new Set<AssistedSessionStatus>([
  'pending',
  'approved',
  'active',
  'declined',
  'revoked',
  'expired',
])

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const extractReason = (req: AuthRequest): string | undefined => {
  const body = req.body
  if (body && typeof body === 'object') {
    const reason = (body as Record<string, unknown>).reason
    if (typeof reason === 'string' && reason.trim().length > 0) {
      return reason.trim()
    }
  }

  const headerReason = req.headers['x-admin-reason']
  if (typeof headerReason === 'string' && headerReason.trim().length > 0) {
    return headerReason.trim()
  }

  return undefined
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AssistedSessionServiceError) {
    return res.status(error.statusCode).json({ error: error.message })
  }

  const details = error instanceof Error ? error.message : undefined
  return res.status(500).json({
    error: fallbackMessage,
    details,
  })
}

/**
 * GET /api/admin/support/sessions
 */
export const listAdminAssistedSessions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined
    if (statusRaw && !VALID_STATUSES.has(statusRaw as AssistedSessionStatus)) {
      return res.status(400).json({ error: 'Parametro status invalido.' })
    }

    const result = await assistedSessionService.listAdminSessions(
      req.user.id,
      {
        status: statusRaw as AssistedSessionStatus | undefined,
        targetUserId: typeof req.query.targetUserId === 'string' ? req.query.targetUserId : undefined,
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List admin assisted sessions error:', error)
    return handleError(res, error, 'Erro ao listar sessoes assistidas.')
  }
}

/**
 * POST /api/admin/support/sessions/request
 */
export const requestAdminAssistedSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : ''
    const reason = extractReason(req)

    if (!targetUserId) {
      return res.status(400).json({ error: 'Campo targetUserId e obrigatorio.' })
    }

    if (!reason) {
      return res.status(400).json({ error: 'Motivo obrigatorio para solicitar sessao assistida.' })
    }

    const session = await assistedSessionService.requestSession({
      adminUserId: req.user.id,
      targetUserId,
      reason,
      note: typeof body.note === 'string' ? body.note : undefined,
      consentTtlMinutes:
        typeof body.consentTtlMinutes === 'number' ? body.consentTtlMinutes : undefined,
      sessionTtlMinutes:
        typeof body.sessionTtlMinutes === 'number' ? body.sessionTtlMinutes : undefined,
    })

    return res.status(201).json({
      message: 'Pedido de sessao assistida criado com sucesso.',
      session,
    })
  } catch (error: unknown) {
    console.error('Request admin assisted session error:', error)
    return handleError(res, error, 'Erro ao criar pedido de sessao assistida.')
  }
}

/**
 * POST /api/admin/support/sessions/:sessionId/start
 */
export const startAdminAssistedSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const result = await assistedSessionService.startSession({
      adminUserId: req.user.id,
      sessionId: req.params.sessionId,
    })

    return res.status(200).json({
      message: 'Sessao assistida iniciada.',
      ...result,
    })
  } catch (error: unknown) {
    console.error('Start admin assisted session error:', error)
    return handleError(res, error, 'Erro ao iniciar sessao assistida.')
  }
}

/**
 * POST /api/admin/support/sessions/:sessionId/revoke
 */
export const revokeAdminAssistedSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const reason = extractReason(req)
    if (!reason) {
      return res.status(400).json({ error: 'Motivo obrigatorio para revogar sessao assistida.' })
    }

    const result = await assistedSessionService.revokeByAdmin({
      adminUserId: req.user.id,
      sessionId: req.params.sessionId,
      reason,
    })

    return res.status(200).json({
      message: result.changed
        ? 'Sessao assistida revogada.'
        : 'Sessao assistida ja se encontrava encerrada.',
      changed: result.changed,
      session: result.session,
    })
  } catch (error: unknown) {
    console.error('Revoke admin assisted session error:', error)
    return handleError(res, error, 'Erro ao revogar sessao assistida.')
  }
}

/**
 * GET /api/admin/support/sessions/:sessionId/history
 */
export const listAdminAssistedSessionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const result = await assistedSessionAuditService.list(
      { sessionId: req.params.sessionId },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List admin assisted session history error:', error)
    return handleError(res, error, 'Erro ao listar historico de sessao assistida.')
  }
}
