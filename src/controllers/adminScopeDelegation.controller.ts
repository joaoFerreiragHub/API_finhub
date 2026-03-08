import { Response } from 'express'
import { ADMIN_SCOPES } from '../admin/permissions'
import { AuthRequest } from '../types/auth'
import {
  AdminScopeDelegationServiceError,
  adminScopeDelegationService,
} from '../services/adminScopeDelegation.service'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_scope_delegation_controller'
const VALID_SCOPE_SET = new Set<string>(ADMIN_SCOPES)
const VALID_STATUS_SET = new Set<string>(['active', 'expired', 'revoked'])

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
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

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminScopeDelegationServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

/**
 * GET /api/admin/users/:userId/scope-delegations
 */
export const listAdminScopeDelegations = async (req: AuthRequest, res: Response) => {
  try {
    const scopeRaw = typeof req.query.scope === 'string' ? req.query.scope.trim() : undefined
    if (scopeRaw && !VALID_SCOPE_SET.has(scopeRaw)) {
      return res.status(400).json({
        error: 'Parametro scope invalido.',
      })
    }

    const statusRaw = typeof req.query.status === 'string' ? req.query.status.trim() : undefined
    if (statusRaw && !VALID_STATUS_SET.has(statusRaw)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }

    const result = await adminScopeDelegationService.listDelegations(
      {
        targetAdminId: req.params.userId,
        scope: scopeRaw,
        status: statusRaw,
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_scope_delegations', error, req)
    return handleError(res, error, 'Erro ao listar delegacoes temporarias de scopes.')
  }
}

/**
 * POST /api/admin/users/:userId/scope-delegations
 */
export const createAdminScopeDelegations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para delegacao temporaria.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const body = extractBodyRecord(req)
    const scopes =
      Array.isArray(body.scopes) && body.scopes.length > 0
        ? body.scopes
        : typeof body.scope === 'string'
          ? [body.scope]
          : []

    const result = await adminScopeDelegationService.createDelegations({
      actorId: req.user.id,
      targetAdminId: req.params.userId,
      scopes,
      expiresAt: body.expiresAt,
      reason,
      note,
    })

    ;(res.locals as Record<string, unknown>).adminScopeDelegationChange = {
      action: 'create',
      scopesRequested: result.summary.scopesRequested,
      delegationsAffected: result.summary.delegationsAffected,
      scopeList: result.items.map((item) => item.scope),
      maxDelegationHours: result.summary.maxDelegationHours,
    }

    return res.status(201).json({
      message: 'Delegacao temporaria de scopes registada com sucesso.',
      ...result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_admin_scope_delegations', error, req)
    return handleError(res, error, 'Erro ao criar delegacao temporaria de scopes.')
  }
}

/**
 * POST /api/admin/users/:userId/scope-delegations/:delegationId/revoke
 */
export const revokeAdminScopeDelegation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para revogar delegacao temporaria.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminScopeDelegationService.revokeDelegation({
      actorId: req.user.id,
      targetAdminId: req.params.userId,
      delegationId: req.params.delegationId,
      reason,
      note,
    })

    ;(res.locals as Record<string, unknown>).adminScopeDelegationChange = {
      action: 'revoke',
      changed: result.changed,
      delegationId: result.item.id,
      scope: result.item.scope,
      status: result.item.status,
    }

    return res.status(200).json({
      message: result.changed
        ? 'Delegacao temporaria revogada com sucesso.'
        : 'Delegacao temporaria ja se encontrava revogada.',
      ...result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'revoke_admin_scope_delegation', error, req)
    return handleError(res, error, 'Erro ao revogar delegacao temporaria.')
  }
}
