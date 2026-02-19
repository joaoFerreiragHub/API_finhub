import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { UserAccountStatus, UserRole } from '../models/User'
import {
  AdminUserServiceError,
  AdminUserSortField,
  adminUserService,
} from '../services/adminUser.service'

const VALID_USER_ROLES = new Set<UserRole>(['visitor', 'free', 'premium', 'creator', 'admin'])
const VALID_ACCOUNT_STATUSES = new Set<UserAccountStatus>(['active', 'suspended', 'banned'])
const VALID_SORT_FIELDS = new Set<AdminUserSortField>([
  'createdAt',
  'updatedAt',
  'lastLoginAt',
  'lastActiveAt',
  'username',
  'email',
])

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value !== 'string') return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
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

const extractNote = (req: AuthRequest): string | undefined => {
  const body = req.body
  if (body && typeof body === 'object') {
    const note = (body as Record<string, unknown>).note
    if (typeof note === 'string' && note.trim().length > 0) {
      return note.trim()
    }
  }

  return undefined
}

const mapUserResponse = (user: {
  id: string
  email: string
  name: string
  username: string
  avatar?: string
  role: UserRole
  accountStatus: UserAccountStatus
  adminReadOnly: boolean
  adminScopes?: string[]
  statusReason?: string
  statusChangedAt?: Date
  tokenVersion: number
  lastForcedLogoutAt?: Date
  lastLoginAt?: Date
  lastActiveAt?: Date
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  username: user.username,
  avatar: user.avatar,
  role: user.role,
  accountStatus: user.accountStatus,
  adminReadOnly: user.adminReadOnly,
  adminScopes: user.adminScopes ?? [],
  statusReason: user.statusReason ?? null,
  statusChangedAt: user.statusChangedAt ?? null,
  tokenVersion: user.tokenVersion,
  lastForcedLogoutAt: user.lastForcedLogoutAt ?? null,
  lastLoginAt: user.lastLoginAt ?? null,
  lastActiveAt: user.lastActiveAt ?? null,
})

const handleAdminUserError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminUserServiceError) {
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
 * GET /api/admin/users
 */
export const listAdminUsers = async (req: AuthRequest, res: Response) => {
  try {
    const roleRaw = typeof req.query.role === 'string' ? req.query.role : undefined
    if (roleRaw && !VALID_USER_ROLES.has(roleRaw as UserRole)) {
      return res.status(400).json({
        error: 'Parametro role invalido.',
      })
    }

    const accountStatusRaw =
      typeof req.query.accountStatus === 'string' ? req.query.accountStatus : undefined
    if (accountStatusRaw && !VALID_ACCOUNT_STATUSES.has(accountStatusRaw as UserAccountStatus)) {
      return res.status(400).json({
        error: 'Parametro accountStatus invalido.',
      })
    }

    const sortByRaw = typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined
    if (sortByRaw && !VALID_SORT_FIELDS.has(sortByRaw as AdminUserSortField)) {
      return res.status(400).json({
        error: 'Parametro sortBy invalido.',
      })
    }

    const sortOrderRaw = typeof req.query.sortOrder === 'string' ? req.query.sortOrder : undefined
    if (sortOrderRaw && sortOrderRaw !== 'asc' && sortOrderRaw !== 'desc') {
      return res.status(400).json({
        error: 'Parametro sortOrder invalido.',
      })
    }

    const result = await adminUserService.listUsers(
      {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        role: roleRaw as UserRole | undefined,
        accountStatus: accountStatusRaw as UserAccountStatus | undefined,
        adminReadOnly: parseBoolean(req.query.adminReadOnly),
        activeSinceDays: parsePositiveInt(req.query.activeSinceDays),
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
        sortBy: sortByRaw as AdminUserSortField | undefined,
        sortOrder: sortOrderRaw === 'asc' || sortOrderRaw === 'desc' ? sortOrderRaw : undefined,
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List admin users error:', error)
    return handleAdminUserError(res, error, 'Erro ao listar utilizadores admin.')
  }
}

const applyStatusAction = async (
  req: AuthRequest,
  res: Response,
  nextStatus: UserAccountStatus,
  successMessage: string
) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Autenticacao necessaria.',
    })
  }

  const reason = extractReason(req)
  if (!reason) {
    return res.status(400).json({
      error: 'Motivo obrigatorio para esta acao.',
    })
  }

  const result = await adminUserService.updateAccountStatus({
    actorId: req.user.id,
    targetUserId: req.params.userId,
    nextStatus,
    reason,
    note: extractNote(req),
  })

  return res.status(200).json({
    message: successMessage,
    changed: result.changed,
    fromStatus: result.fromStatus,
    user: mapUserResponse({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      username: result.user.username,
      avatar: result.user.avatar,
      role: result.user.role,
      accountStatus: result.user.accountStatus,
      adminReadOnly: result.user.adminReadOnly,
      adminScopes: result.user.adminScopes ?? [],
      statusReason: result.user.statusReason,
      statusChangedAt: result.user.statusChangedAt,
      tokenVersion: result.user.tokenVersion,
      lastForcedLogoutAt: result.user.lastForcedLogoutAt,
      lastLoginAt: result.user.lastLoginAt,
      lastActiveAt: result.user.lastActiveAt,
    }),
  })
}

/**
 * POST /api/admin/users/:userId/suspend
 */
export const suspendUser = async (req: AuthRequest, res: Response) => {
  try {
    return await applyStatusAction(req, res, 'suspended', 'Conta suspensa com sucesso.')
  } catch (error: unknown) {
    console.error('Suspend user error:', error)
    return handleAdminUserError(res, error, 'Erro ao suspender utilizador.')
  }
}

/**
 * POST /api/admin/users/:userId/ban
 */
export const banUser = async (req: AuthRequest, res: Response) => {
  try {
    return await applyStatusAction(req, res, 'banned', 'Conta banida com sucesso.')
  } catch (error: unknown) {
    console.error('Ban user error:', error)
    return handleAdminUserError(res, error, 'Erro ao banir utilizador.')
  }
}

/**
 * POST /api/admin/users/:userId/unban
 * Nota: o endpoint tambem reativa contas suspensas.
 */
export const unbanUser = async (req: AuthRequest, res: Response) => {
  try {
    return await applyStatusAction(req, res, 'active', 'Conta reativada com sucesso.')
  } catch (error: unknown) {
    console.error('Unban user error:', error)
    return handleAdminUserError(res, error, 'Erro ao reativar utilizador.')
  }
}

/**
 * POST /api/admin/users/:userId/force-logout
 */
export const forceLogoutUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const reason = extractReason(req)
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para force logout.',
      })
    }

    const updatedUser = await adminUserService.forceLogout({
      actorId: req.user.id,
      targetUserId: req.params.userId,
      reason,
      note: extractNote(req),
    })

    return res.status(200).json({
      message: 'Force logout aplicado com sucesso.',
      user: mapUserResponse({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        username: updatedUser.username,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        accountStatus: updatedUser.accountStatus,
        adminReadOnly: updatedUser.adminReadOnly,
        adminScopes: updatedUser.adminScopes ?? [],
        statusReason: updatedUser.statusReason,
        statusChangedAt: updatedUser.statusChangedAt,
        tokenVersion: updatedUser.tokenVersion,
        lastForcedLogoutAt: updatedUser.lastForcedLogoutAt,
        lastLoginAt: updatedUser.lastLoginAt,
        lastActiveAt: updatedUser.lastActiveAt,
      }),
    })
  } catch (error: unknown) {
    console.error('Force logout user error:', error)
    return handleAdminUserError(res, error, 'Erro ao aplicar force logout.')
  }
}

/**
 * POST /api/admin/users/:userId/notes
 */
export const addUserInternalNote = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const note = extractNote(req)
    if (!note) {
      return res.status(400).json({
        error: 'Campo note e obrigatorio.',
      })
    }

    const reason = extractReason(req) ?? 'Nota interna'
    const event = await adminUserService.addInternalNote({
      actorId: req.user.id,
      targetUserId: req.params.userId,
      reason,
      note,
    })

    return res.status(201).json({
      message: 'Nota interna registada.',
      event: {
        id: event.id,
        user: event.user,
        actor: event.actor,
        action: event.action,
        reason: event.reason,
        note: event.note,
        createdAt: event.createdAt,
      },
    })
  } catch (error: unknown) {
    console.error('Add user internal note error:', error)
    return handleAdminUserError(res, error, 'Erro ao registar nota interna.')
  }
}

/**
 * GET /api/admin/users/:userId/history
 */
export const listUserModerationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminUserService.listHistory(req.params.userId, {
      page: parsePositiveInt(req.query.page),
      limit: parsePositiveInt(req.query.limit),
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List user moderation history error:', error)
    return handleAdminUserError(res, error, 'Erro ao listar historico de moderacao.')
  }
}
