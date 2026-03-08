import mongoose from 'mongoose'
import {
  ADMIN_SCOPES,
  AdminScope,
  getAdminScopesForUser,
  isAdminWriteScope,
} from '../admin/permissions'
import {
  AdminScopeDelegation,
  AdminScopeDelegationStatus,
  IAdminScopeDelegation,
} from '../models/AdminScopeDelegation'
import { User } from '../models/User'
import { resolvePagination } from '../utils/pagination'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const DEFAULT_MAX_DELEGATION_HOURS = 24 * 14
const DEFAULT_MAX_SCOPES_PER_REQUEST = 10
const DEFAULT_RETENTION_DAYS = 90
const VALID_ADMIN_SCOPE_SET = new Set<string>(ADMIN_SCOPES)

const parsePositiveIntEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const MAX_DELEGATION_HOURS = parsePositiveIntEnv(
  process.env.ADMIN_SCOPE_DELEGATION_MAX_HOURS,
  DEFAULT_MAX_DELEGATION_HOURS
)
const MAX_SCOPES_PER_REQUEST = parsePositiveIntEnv(
  process.env.ADMIN_SCOPE_DELEGATION_MAX_SCOPES_PER_REQUEST,
  DEFAULT_MAX_SCOPES_PER_REQUEST
)
const RETENTION_DAYS = parsePositiveIntEnv(
  process.env.ADMIN_SCOPE_DELEGATION_RETENTION_DAYS,
  DEFAULT_RETENTION_DAYS
)

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toObjectId = (value: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AdminScopeDelegationServiceError(400, `${fieldName} invalido.`)
  }
  return new mongoose.Types.ObjectId(value)
}

const parseScopeFilter = (value?: string): AdminScope | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined
  const normalized = value.trim()
  if (!VALID_ADMIN_SCOPE_SET.has(normalized)) {
    throw new AdminScopeDelegationServiceError(400, 'Scope admin invalido.')
  }
  return normalized as AdminScope
}

const parseStatusFilter = (value?: string): AdminScopeDelegationStatus | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined
  if (value === 'active' || value === 'expired' || value === 'revoked') return value
  throw new AdminScopeDelegationServiceError(400, 'Status de delegacao invalido.')
}

const normalizeScopesInput = (scopesRaw: unknown): AdminScope[] => {
  if (!Array.isArray(scopesRaw) || scopesRaw.length === 0) {
    throw new AdminScopeDelegationServiceError(400, 'Lista scopes obrigatoria para delegacao.')
  }

  if (scopesRaw.length > MAX_SCOPES_PER_REQUEST) {
    throw new AdminScopeDelegationServiceError(
      400,
      `Limite maximo de ${MAX_SCOPES_PER_REQUEST} scopes por pedido excedido.`
    )
  }

  const unique = new Set<AdminScope>()
  for (const raw of scopesRaw) {
    if (typeof raw !== 'string' || !VALID_ADMIN_SCOPE_SET.has(raw)) {
      throw new AdminScopeDelegationServiceError(400, 'Payload contem scopes admin invalidos.')
    }
    unique.add(raw as AdminScope)
  }

  return [...unique].sort((left, right) => left.localeCompare(right))
}

const parseExpiresAt = (raw: unknown): Date => {
  const input = normalizeText(raw)
  if (!input) {
    throw new AdminScopeDelegationServiceError(400, 'Campo expiresAt obrigatorio para delegacao.')
  }

  const expiresAt = new Date(input)
  if (Number.isNaN(expiresAt.getTime())) {
    throw new AdminScopeDelegationServiceError(400, 'Campo expiresAt invalido.')
  }

  const now = Date.now()
  if (expiresAt.getTime() <= now) {
    throw new AdminScopeDelegationServiceError(400, 'expiresAt deve ser uma data futura.')
  }

  const maxExpiry = now + MAX_DELEGATION_HOURS * 60 * 60 * 1000
  if (expiresAt.getTime() > maxExpiry) {
    throw new AdminScopeDelegationServiceError(
      400,
      `expiresAt excede limite de ${MAX_DELEGATION_HOURS} horas para delegacao temporaria.`
    )
  }

  return expiresAt
}

export class AdminScopeDelegationServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class AdminScopeDelegationService {
  async hasActiveScopeDelegation(targetAdminIdRaw: string, scope: AdminScope): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(targetAdminIdRaw)) return false

    const now = new Date()
    const exists = await AdminScopeDelegation.exists({
      delegatedTo: new mongoose.Types.ObjectId(targetAdminIdRaw),
      scope,
      revokedAt: null,
      startsAt: { $lte: now },
      expiresAt: { $gt: now },
    })

    return Boolean(exists)
  }

  async listDelegations(
    filters: {
      targetAdminId: string
      scope?: string
      status?: string
    },
    options: {
      page?: number
      limit?: number
    } = {}
  ) {
    const targetAdminId = toObjectId(filters.targetAdminId, 'targetAdminId')
    const scope = parseScopeFilter(filters.scope)
    const status = parseStatusFilter(filters.status)
    const now = new Date()

    const query: Record<string, unknown> = {
      delegatedTo: targetAdminId,
    }
    if (scope) query.scope = scope

    if (status === 'active') {
      query.revokedAt = null
      query.startsAt = { $lte: now }
      query.expiresAt = { $gt: now }
    } else if (status === 'expired') {
      query.revokedAt = null
      query.expiresAt = { $lte: now }
    } else if (status === 'revoked') {
      query.revokedAt = { $ne: null }
    }

    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const [items, total] = await Promise.all([
      AdminScopeDelegation.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('delegatedBy', 'name username email role')
        .populate('delegatedTo', 'name username email role')
        .populate('revokedBy', 'name username email role')
        .lean(),
      AdminScopeDelegation.countDocuments(query),
    ])

    return {
      items: items.map((item) => this.mapDelegation(item, now)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async createDelegations(input: {
    actorId: string
    targetAdminId: string
    scopes: unknown
    expiresAt: unknown
    reason: string
    note?: string
  }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const targetAdminId = toObjectId(input.targetAdminId, 'targetAdminId')

    if (actorId.equals(targetAdminId)) {
      throw new AdminScopeDelegationServiceError(
        400,
        'Delegacao para a propria conta admin nao e permitida.'
      )
    }

    const scopes = normalizeScopesInput(input.scopes)
    const expiresAt = parseExpiresAt(input.expiresAt)
    const reason = normalizeText(input.reason)
    if (!reason) {
      throw new AdminScopeDelegationServiceError(400, 'Motivo obrigatorio para delegacao temporaria.')
    }
    if (reason.length > 500) {
      throw new AdminScopeDelegationServiceError(400, 'Motivo excede limite de 500 caracteres.')
    }

    const note = normalizeText(input.note)
    if (note && note.length > 2000) {
      throw new AdminScopeDelegationServiceError(400, 'Nota excede limite de 2000 caracteres.')
    }

    const [actorUser, targetUser] = await Promise.all([
      User.findById(actorId).select('role adminScopes adminReadOnly'),
      User.findById(targetAdminId).select('role adminReadOnly'),
    ])

    if (!actorUser || actorUser.role !== 'admin') {
      throw new AdminScopeDelegationServiceError(403, 'Apenas admins podem delegar scopes.')
    }

    if (!targetUser) {
      throw new AdminScopeDelegationServiceError(404, 'Admin alvo nao encontrado.')
    }
    if (targetUser.role !== 'admin') {
      throw new AdminScopeDelegationServiceError(409, 'Delegacao temporaria aplica-se apenas a contas admin.')
    }

    const actorBaseScopes = getAdminScopesForUser({
      role: actorUser.role,
      adminScopes: actorUser.adminScopes ?? [],
    })

    for (const scope of scopes) {
      if (!actorBaseScopes.has(scope)) {
        throw new AdminScopeDelegationServiceError(
          403,
          `Nao podes delegar scope '${scope}' sem o teres atribuido no teu perfil base.`
        )
      }

      if (actorUser.adminReadOnly && isAdminWriteScope(scope)) {
        throw new AdminScopeDelegationServiceError(
          403,
          `Modo read-only impede delegacao de scope de escrita ('${scope}').`
        )
      }

      if (targetUser.adminReadOnly && isAdminWriteScope(scope)) {
        throw new AdminScopeDelegationServiceError(
          409,
          `Admin alvo esta em read-only e nao pode receber scope de escrita ('${scope}').`
        )
      }
    }

    const now = new Date()
    const purgeAt = new Date(expiresAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000)

    const createdOrUpdated: IAdminScopeDelegation[] = []
    for (const scope of scopes) {
      const existing = await AdminScopeDelegation.findOne({
        delegatedTo: targetAdminId,
        scope,
        revokedAt: null,
        startsAt: { $lte: now },
        expiresAt: { $gt: now },
      })

      if (existing) {
        existing.delegatedBy = actorId
        existing.reason = reason
        existing.note = note
        existing.expiresAt = expiresAt
        existing.purgeAt = purgeAt
        await existing.save()
        createdOrUpdated.push(existing)
        continue
      }

      const created = await AdminScopeDelegation.create({
        delegatedBy: actorId,
        delegatedTo: targetAdminId,
        scope,
        reason,
        note,
        startsAt: now,
        expiresAt,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        revokeNote: null,
        purgeAt,
      })
      createdOrUpdated.push(created)
    }

    const reloaded = await AdminScopeDelegation.find({
      _id: { $in: createdOrUpdated.map((item) => item._id) },
    })
      .sort({ scope: 1 })
      .populate('delegatedBy', 'name username email role')
      .populate('delegatedTo', 'name username email role')
      .populate('revokedBy', 'name username email role')
      .lean()

    return {
      items: reloaded.map((item) => this.mapDelegation(item, now)),
      summary: {
        scopesRequested: scopes.length,
        delegationsAffected: reloaded.length,
        maxDelegationHours: MAX_DELEGATION_HOURS,
      },
    }
  }

  async revokeDelegation(input: {
    actorId: string
    targetAdminId: string
    delegationId: string
    reason: string
    note?: string
  }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const targetAdminId = toObjectId(input.targetAdminId, 'targetAdminId')
    const delegationId = toObjectId(input.delegationId, 'delegationId')

    const reason = normalizeText(input.reason)
    if (!reason) {
      throw new AdminScopeDelegationServiceError(400, 'Motivo obrigatorio para revogar delegacao.')
    }
    if (reason.length > 500) {
      throw new AdminScopeDelegationServiceError(400, 'Motivo excede limite de 500 caracteres.')
    }

    const note = normalizeText(input.note)
    if (note && note.length > 2000) {
      throw new AdminScopeDelegationServiceError(400, 'Nota excede limite de 2000 caracteres.')
    }

    const actorUser = await User.findById(actorId).select('role')
    if (!actorUser || actorUser.role !== 'admin') {
      throw new AdminScopeDelegationServiceError(403, 'Apenas admins podem revogar delegacoes.')
    }

    const delegation = await AdminScopeDelegation.findOne({
      _id: delegationId,
      delegatedTo: targetAdminId,
    })
    if (!delegation) {
      throw new AdminScopeDelegationServiceError(404, 'Delegacao temporaria nao encontrada.')
    }

    const changed = delegation.revokedAt == null
    if (changed) {
      delegation.revokedAt = new Date()
      delegation.revokedBy = actorId
      delegation.revokeReason = reason
      delegation.revokeNote = note
      await delegation.save()
    }

    const reloaded = await AdminScopeDelegation.findById(delegation._id)
      .populate('delegatedBy', 'name username email role')
      .populate('delegatedTo', 'name username email role')
      .populate('revokedBy', 'name username email role')
      .lean()

    if (!reloaded) {
      throw new AdminScopeDelegationServiceError(
        500,
        'Falha ao carregar delegacao apos revogacao.'
      )
    }

    return {
      changed,
      item: this.mapDelegation(reloaded, new Date()),
    }
  }

  private mapDelegation(item: any, now: Date) {
    return {
      id: String(item._id),
      scope: item.scope as AdminScope,
      status: this.resolveStatus(item, now),
      reason: item.reason,
      note: item.note ?? null,
      delegatedBy:
        item.delegatedBy && typeof item.delegatedBy === 'object'
          ? {
              id: String(item.delegatedBy._id ?? item.delegatedBy.id),
              name: item.delegatedBy.name,
              username: item.delegatedBy.username,
              email: item.delegatedBy.email,
              role: item.delegatedBy.role,
            }
          : null,
      delegatedTo:
        item.delegatedTo && typeof item.delegatedTo === 'object'
          ? {
              id: String(item.delegatedTo._id ?? item.delegatedTo.id),
              name: item.delegatedTo.name,
              username: item.delegatedTo.username,
              email: item.delegatedTo.email,
              role: item.delegatedTo.role,
            }
          : null,
      startsAt: item.startsAt ?? null,
      expiresAt: item.expiresAt,
      revokedAt: item.revokedAt ?? null,
      revokedBy:
        item.revokedBy && typeof item.revokedBy === 'object'
          ? {
              id: String(item.revokedBy._id ?? item.revokedBy.id),
              name: item.revokedBy.name,
              username: item.revokedBy.username,
              email: item.revokedBy.email,
              role: item.revokedBy.role,
            }
          : null,
      revokeReason: item.revokeReason ?? null,
      revokeNote: item.revokeNote ?? null,
      createdAt: item.createdAt ?? null,
      updatedAt: item.updatedAt ?? null,
    }
  }

  private resolveStatus(item: any, now: Date): AdminScopeDelegationStatus {
    if (item.revokedAt) return 'revoked'

    const expiresAtMs = item.expiresAt ? new Date(item.expiresAt).getTime() : 0
    if (expiresAtMs > 0 && expiresAtMs <= now.getTime()) return 'expired'

    return 'active'
  }
}

export const adminScopeDelegationService = new AdminScopeDelegationService()
