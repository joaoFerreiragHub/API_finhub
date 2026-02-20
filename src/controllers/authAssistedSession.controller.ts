import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  AssistedSessionServiceError,
  assistedSessionService,
} from '../services/assistedSession.service'

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

const readOptionalTextField = (req: AuthRequest, field: string): string | undefined => {
  const body = req.body
  if (body && typeof body === 'object') {
    const value = (body as Record<string, unknown>)[field]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return undefined
}

/**
 * GET /api/auth/assisted-sessions/pending
 */
export const listMyPendingAssistedSessionRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Nao autenticado.' })

    const result = await assistedSessionService.listUserPendingSessions(req.user.id)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List my pending assisted sessions error:', error)
    return handleError(res, error, 'Erro ao listar pedidos de sessao assistida.')
  }
}

/**
 * GET /api/auth/assisted-sessions/active
 */
export const listMyActiveAssistedSessions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Nao autenticado.' })

    const result = await assistedSessionService.listUserActiveSessions(req.user.id)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List my active assisted sessions error:', error)
    return handleError(res, error, 'Erro ao listar sessoes assistidas ativas.')
  }
}

/**
 * POST /api/auth/assisted-sessions/:sessionId/consent
 */
export const respondMyAssistedSessionRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Nao autenticado.' })

    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
    const decision = body.decision

    if (decision !== 'approve' && decision !== 'decline') {
      return res.status(400).json({
        error: "Campo decision invalido. Usa 'approve' ou 'decline'.",
      })
    }

    const session = await assistedSessionService.respondToRequest({
      targetUserId: req.user.id,
      sessionId: req.params.sessionId,
      decision,
      note: readOptionalTextField(req, 'note'),
    })

    return res.status(200).json({
      message:
        decision === 'approve'
          ? 'Consentimento registado com sucesso.'
          : 'Recusa de consentimento registada com sucesso.',
      session,
    })
  } catch (error: unknown) {
    console.error('Respond my assisted session request error:', error)
    return handleError(res, error, 'Erro ao responder pedido de sessao assistida.')
  }
}

/**
 * POST /api/auth/assisted-sessions/:sessionId/revoke
 */
export const revokeMyAssistedSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Nao autenticado.' })

    const result = await assistedSessionService.revokeByTarget({
      targetUserId: req.user.id,
      sessionId: req.params.sessionId,
      reason: readOptionalTextField(req, 'reason'),
    })

    return res.status(200).json({
      message: result.changed
        ? 'Sessao assistida revogada com sucesso.'
        : 'Sessao assistida ja estava encerrada.',
      changed: result.changed,
      session: result.session,
    })
  } catch (error: unknown) {
    console.error('Revoke my assisted session error:', error)
    return handleError(res, error, 'Erro ao revogar sessao assistida.')
  }
}
