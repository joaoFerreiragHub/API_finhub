import mongoose from 'mongoose'
import { AssistedSession, AssistedSessionStatus, IAssistedSession } from '../models/AssistedSession'
import { User } from '../models/User'
import { notificationService } from './notification.service'
import { AssistedSessionTokenPayload, generateTokens } from '../utils/jwt'

export interface AssistedSessionUserSummary {
  id: string
  name: string
  username: string
  email: string
  role: string
}

export interface AssistedSessionView {
  id: string
  adminUser: AssistedSessionUserSummary | null
  targetUser: AssistedSessionUserSummary | null
  scope: 'read_only'
  status: AssistedSessionStatus
  reason: string
  note: string | null
  consentExpiresAt: Date
  requestedSessionTtlMinutes: number
  approvedAt: Date | null
  startedAt: Date | null
  sessionExpiresAt: Date | null
  declinedAt: Date | null
  declinedReason: string | null
  revokedAt: Date | null
  revokedBy: string | null
  revokedReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AssistedSessionPagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface StartAssistedSessionResult {
  session: AssistedSessionView
  actingUser: {
    id: string
    email: string
    name: string
    username: string
    avatar?: string
    role: string
    accountStatus: string
    adminReadOnly: boolean
    adminScopes: string[]
    assistedSession: AssistedSessionTokenPayload
  }
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export class AssistedSessionServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

const DEFAULT_CONSENT_TTL_MINUTES = 15
const DEFAULT_SESSION_TTL_MINUTES = 15
const MIN_TTL_MINUTES = 5
const MAX_TTL_MINUTES = 30
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const OPEN_STATUSES: AssistedSessionStatus[] = ['pending', 'approved', 'active']

const toObjectId = (rawId: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    throw new AssistedSessionServiceError(400, `${fieldName} invalido.`)
  }
  return new mongoose.Types.ObjectId(rawId)
}

const normalizeTtl = (value: number | undefined, fallback: number): number => {
  if (!value || !Number.isFinite(value)) return fallback
  const normalized = Math.floor(value)
  if (normalized < MIN_TTL_MINUTES) return MIN_TTL_MINUTES
  if (normalized > MAX_TTL_MINUTES) return MAX_TTL_MINUTES
  return normalized
}

const normalizePage = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_PAGE
  return Math.floor(value)
}

const normalizeLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(value), MAX_LIMIT)
}

const toOutcome = (statusCode: number): 'success' | 'forbidden' | 'error' => {
  if (statusCode >= 500) return 'error'
  if (statusCode >= 400) return 'forbidden'
  return 'success'
}

const isObjectWithId = (value: unknown): value is {
  _id?: unknown
  id?: unknown
  name?: unknown
  username?: unknown
  email?: unknown
  role?: unknown
} => {
  return typeof value === 'object' && value !== null
}

const resolveRefId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) return value
  if (value instanceof mongoose.Types.ObjectId) return value.toString()
  if (!isObjectWithId(value)) return null

  if (typeof value.id === 'string' && value.id.length > 0) return value.id
  if (typeof value._id === 'string' && value._id.length > 0) return value._id
  if (value._id instanceof mongoose.Types.ObjectId) return value._id.toString()

  return null
}

const ensureRefId = (value: unknown, fieldName: string): string => {
  const resolved = resolveRefId(value)
  if (!resolved) {
    throw new AssistedSessionServiceError(500, `Falha ao resolver referencia '${fieldName}'.`)
  }
  return resolved
}

const mapUserSummary = (value: unknown): AssistedSessionUserSummary | null => {
  if (!isObjectWithId(value)) return null
  const maybeId = typeof value.id === 'string' ? value.id : value._id
  if (typeof maybeId !== 'string') return null

  return {
    id: maybeId,
    name: typeof value.name === 'string' ? value.name : 'Utilizador',
    username: typeof value.username === 'string' ? value.username : maybeId,
    email: typeof value.email === 'string' ? value.email : '',
    role: typeof value.role === 'string' ? value.role : 'free',
  }
}

const mapSession = (session: IAssistedSession): AssistedSessionView => {
  return {
    id: session.id,
    adminUser: mapUserSummary(session.adminUser),
    targetUser: mapUserSummary(session.targetUser),
    scope: session.scope,
    status: session.status,
    reason: session.reason,
    note: session.note ?? null,
    consentExpiresAt: session.consentExpiresAt,
    requestedSessionTtlMinutes: session.requestedSessionTtlMinutes,
    approvedAt: session.approvedAt ?? null,
    startedAt: session.startedAt ?? null,
    sessionExpiresAt: session.sessionExpiresAt ?? null,
    declinedAt: session.declinedAt ?? null,
    declinedReason: session.declinedReason ?? null,
    revokedAt: session.revokedAt ?? null,
    revokedBy: session.revokedBy ? String(session.revokedBy) : null,
    revokedReason: session.revokedReason ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

export class AssistedSessionService {
  private async expireStaleSessions() {
    const now = new Date()

    await Promise.all([
      AssistedSession.updateMany(
        {
          status: { $in: ['pending', 'approved'] },
          consentExpiresAt: { $lte: now },
        },
        { $set: { status: 'expired' } }
      ),
      AssistedSession.updateMany(
        {
          status: 'active',
          sessionExpiresAt: { $lte: now },
        },
        { $set: { status: 'expired' } }
      ),
    ])
  }

  async requestSession(input: {
    adminUserId: string
    targetUserId: string
    reason: string
    note?: string
    consentTtlMinutes?: number
    sessionTtlMinutes?: number
  }): Promise<AssistedSessionView> {
    const adminUserId = toObjectId(input.adminUserId, 'adminUserId')
    const targetUserId = toObjectId(input.targetUserId, 'targetUserId')

    if (adminUserId.equals(targetUserId)) {
      throw new AssistedSessionServiceError(
        400,
        'Nao e permitido criar sessao assistida para a propria conta.'
      )
    }

    await this.expireStaleSessions()

    const [adminUser, targetUser] = await Promise.all([
      User.findById(adminUserId).select('name username email role').lean(),
      User.findById(targetUserId).select('name username email role accountStatus').lean(),
    ])

    if (!adminUser || adminUser.role !== 'admin') {
      throw new AssistedSessionServiceError(403, 'Apenas admins podem solicitar sessao assistida.')
    }

    if (!targetUser) {
      throw new AssistedSessionServiceError(404, 'Utilizador alvo nao encontrado.')
    }

    if (targetUser.role === 'admin') {
      throw new AssistedSessionServiceError(403, 'Sessao assistida para contas admin nao e permitida.')
    }

    if (targetUser.accountStatus !== 'active') {
      throw new AssistedSessionServiceError(
        409,
        'A conta alvo nao esta ativa para sessao assistida.'
      )
    }

    const existingOpenSession = await AssistedSession.findOne({
      adminUser: adminUserId,
      targetUser: targetUserId,
      status: { $in: OPEN_STATUSES },
    })
      .sort({ createdAt: -1 })
      .lean()

    if (existingOpenSession) {
      throw new AssistedSessionServiceError(
        409,
        'Ja existe uma sessao assistida em aberto para este utilizador.'
      )
    }

    const consentTtlMinutes = normalizeTtl(input.consentTtlMinutes, DEFAULT_CONSENT_TTL_MINUTES)
    const sessionTtlMinutes = normalizeTtl(input.sessionTtlMinutes, DEFAULT_SESSION_TTL_MINUTES)
    const now = Date.now()

    const session = await AssistedSession.create({
      adminUser: adminUserId,
      targetUser: targetUserId,
      scope: 'read_only',
      status: 'pending',
      reason: input.reason.trim(),
      note: input.note?.trim() || null,
      consentExpiresAt: new Date(now + consentTtlMinutes * 60 * 1000),
      requestedSessionTtlMinutes: sessionTtlMinutes,
    })

    await session.populate([
      { path: 'adminUser', select: 'name username email role' },
      { path: 'targetUser', select: 'name username email role' },
    ])

    // Reusa notificacao existente para alertar o user de um pedido de consentimento.
    await notificationService.create({
      user: String(targetUserId),
      type: 'mention',
      triggeredBy: String(adminUserId),
      targetType: 'assisted_session',
      targetId: session.id,
      message: `Pedido de suporte assistido de @${adminUser.username}. Expira em ${consentTtlMinutes} min.`,
    })

    return mapSession(session)
  }

  async listAdminSessions(
    adminUserIdRaw: string,
    filters: { status?: AssistedSessionStatus; targetUserId?: string } = {},
    options: { page?: number; limit?: number } = {}
  ) {
    const adminUserId = toObjectId(adminUserIdRaw, 'adminUserId')
    await this.expireStaleSessions()

    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = { adminUser: adminUserId }
    if (filters.status) query.status = filters.status
    if (filters.targetUserId) query.targetUser = toObjectId(filters.targetUserId, 'targetUserId')

    const [items, total] = await Promise.all([
      AssistedSession.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('adminUser', 'name username email role')
        .populate('targetUser', 'name username email role')
        .exec(),
      AssistedSession.countDocuments(query),
    ])

    return {
      items: items.map(mapSession),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      } as AssistedSessionPagination,
    }
  }

  async listUserPendingSessions(targetUserIdRaw: string) {
    const targetUserId = toObjectId(targetUserIdRaw, 'targetUserId')
    await this.expireStaleSessions()

    const items = await AssistedSession.find({
      targetUser: targetUserId,
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .populate('adminUser', 'name username email role')
      .populate('targetUser', 'name username email role')

    return {
      items: items.map(mapSession),
      total: items.length,
    }
  }

  async listUserActiveSessions(targetUserIdRaw: string) {
    const targetUserId = toObjectId(targetUserIdRaw, 'targetUserId')
    await this.expireStaleSessions()

    const items = await AssistedSession.find({
      targetUser: targetUserId,
      status: 'active',
    })
      .sort({ createdAt: -1 })
      .populate('adminUser', 'name username email role')
      .populate('targetUser', 'name username email role')

    return {
      items: items.map(mapSession),
      total: items.length,
    }
  }

  async respondToRequest(input: {
    targetUserId: string
    sessionId: string
    decision: 'approve' | 'decline'
    note?: string
  }): Promise<AssistedSessionView> {
    const targetUserId = toObjectId(input.targetUserId, 'targetUserId')
    const sessionId = toObjectId(input.sessionId, 'sessionId')
    await this.expireStaleSessions()

    const session = await AssistedSession.findOne({
      _id: sessionId,
      targetUser: targetUserId,
    }).populate([
      { path: 'adminUser', select: 'name username email role' },
      { path: 'targetUser', select: 'name username email role' },
    ])

    if (!session) {
      throw new AssistedSessionServiceError(404, 'Pedido de sessao assistida nao encontrado.')
    }

    if (session.status !== 'pending') {
      throw new AssistedSessionServiceError(409, 'Este pedido ja nao pode ser respondido.')
    }

    const now = new Date()
    if (session.consentExpiresAt <= now) {
      session.status = 'expired'
      await session.save()
      throw new AssistedSessionServiceError(410, 'O pedido de consentimento expirou.')
    }

    if (input.decision === 'approve') {
      session.status = 'approved'
      session.approvedAt = now
      session.declinedAt = undefined
      session.declinedReason = undefined
    } else {
      session.status = 'declined'
      session.declinedAt = now
      session.declinedReason = input.note?.trim() || 'Pedido rejeitado pelo utilizador.'
    }

    await session.save()
    await session.populate([
      { path: 'adminUser', select: 'name username email role' },
      { path: 'targetUser', select: 'name username email role' },
    ])

    await notificationService.create({
      user: ensureRefId(session.adminUser, 'adminUser'),
      type: 'mention',
      triggeredBy: String(targetUserId),
      targetType: 'assisted_session',
      targetId: session.id,
      message:
        input.decision === 'approve'
          ? 'Consentimento concedido para sessao assistida.'
          : 'Consentimento recusado para sessao assistida.',
    })

    return mapSession(session)
  }

  async startSession(input: { adminUserId: string; sessionId: string }): Promise<StartAssistedSessionResult> {
    const adminUserId = toObjectId(input.adminUserId, 'adminUserId')
    const sessionId = toObjectId(input.sessionId, 'sessionId')
    await this.expireStaleSessions()

    const session = await AssistedSession.findOne({
      _id: sessionId,
      adminUser: adminUserId,
    }).populate([
      { path: 'adminUser', select: 'name username email role' },
      { path: 'targetUser', select: 'name username email role accountStatus avatar adminReadOnly adminScopes tokenVersion' },
    ])

    if (!session) {
      throw new AssistedSessionServiceError(404, 'Sessao assistida nao encontrada.')
    }

    if (session.status === 'revoked' || session.status === 'declined' || session.status === 'expired') {
      throw new AssistedSessionServiceError(409, 'Sessao assistida nao esta elegivel para inicio.')
    }

    if (session.status === 'pending') {
      throw new AssistedSessionServiceError(
        409,
        'Consentimento pendente. O utilizador precisa aprovar antes de iniciar.'
      )
    }

    const targetUser = session.targetUser as unknown as {
      id: string
      email: string
      name: string
      username: string
      avatar?: string
      role: string
      accountStatus: string
      adminReadOnly?: boolean
      adminScopes?: string[]
      tokenVersion: number
    }

    if (!targetUser || typeof targetUser.id !== 'string') {
      throw new AssistedSessionServiceError(500, 'Falha ao resolver utilizador alvo da sessao.')
    }

    if (targetUser.accountStatus !== 'active') {
      throw new AssistedSessionServiceError(409, 'Utilizador alvo sem estado ativo para sessao assistida.')
    }

    if (targetUser.role === 'admin') {
      throw new AssistedSessionServiceError(403, 'Sessao assistida para contas admin nao e permitida.')
    }

    const now = new Date()
    if (!session.sessionExpiresAt || session.sessionExpiresAt <= now || session.status !== 'active') {
      session.status = 'active'
      session.startedAt = now
      session.sessionExpiresAt = new Date(
        now.getTime() + session.requestedSessionTtlMinutes * 60 * 1000
      )
      await session.save()
    }

    const assistedClaim: AssistedSessionTokenPayload = {
      sessionId: session.id,
      adminUserId: ensureRefId(session.adminUser, 'adminUser'),
      targetUserId: targetUser.id,
      scope: session.scope,
      expiresAt: (session.sessionExpiresAt as Date).toISOString(),
    }

    if (!assistedClaim.adminUserId) {
      throw new AssistedSessionServiceError(500, 'Falha ao resolver o admin da sessao assistida.')
    }

    const tokens = generateTokens({
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role as any,
      tokenVersion: targetUser.tokenVersion,
      assistedSession: assistedClaim,
    })

    await notificationService.create({
      user: targetUser.id,
      type: 'mention',
      triggeredBy: assistedClaim.adminUserId,
      targetType: 'assisted_session',
      targetId: session.id,
      message: 'Sessao assistida iniciada com escopo minimo (read-only).',
    })

    return {
      session: mapSession(session),
      actingUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        username: targetUser.username,
        avatar: targetUser.avatar,
        role: targetUser.role,
        accountStatus: targetUser.accountStatus,
        adminReadOnly: Boolean(targetUser.adminReadOnly),
        adminScopes: Array.isArray(targetUser.adminScopes) ? targetUser.adminScopes : [],
        assistedSession: assistedClaim,
      },
      tokens,
    }
  }

  async revokeByAdmin(input: { adminUserId: string; sessionId: string; reason: string }) {
    const adminUserId = toObjectId(input.adminUserId, 'adminUserId')
    const sessionId = toObjectId(input.sessionId, 'sessionId')

    const session = await AssistedSession.findOne({
      _id: sessionId,
      adminUser: adminUserId,
    }).populate([
      { path: 'adminUser', select: 'name username email role' },
      { path: 'targetUser', select: 'name username email role' },
    ])

    if (!session) {
      throw new AssistedSessionServiceError(404, 'Sessao assistida nao encontrada.')
    }

    if (!OPEN_STATUSES.includes(session.status)) {
      return {
        changed: false,
        session: mapSession(session),
      }
    }

    session.status = 'revoked'
    session.revokedAt = new Date()
    session.revokedBy = adminUserId
    session.revokedReason = input.reason.trim()
    await session.save()

    await notificationService.create({
      user: ensureRefId(session.targetUser, 'targetUser'),
      type: 'mention',
      triggeredBy: String(adminUserId),
      targetType: 'assisted_session',
      targetId: session.id,
      message: 'Sessao assistida revogada pelo suporte.',
    })

    return {
      changed: true,
      session: mapSession(session),
    }
  }

  async revokeByTarget(input: { targetUserId: string; sessionId: string; reason?: string }) {
    const targetUserId = toObjectId(input.targetUserId, 'targetUserId')
    const sessionId = toObjectId(input.sessionId, 'sessionId')

    const session = await AssistedSession.findOne({
      _id: sessionId,
      targetUser: targetUserId,
    }).populate([
      { path: 'adminUser', select: 'name username email role' },
      { path: 'targetUser', select: 'name username email role' },
    ])

    if (!session) {
      throw new AssistedSessionServiceError(404, 'Sessao assistida nao encontrada.')
    }

    if (!OPEN_STATUSES.includes(session.status)) {
      return {
        changed: false,
        session: mapSession(session),
      }
    }

    session.status = 'revoked'
    session.revokedAt = new Date()
    session.revokedBy = targetUserId
    session.revokedReason = input.reason?.trim() || 'Sessao encerrada pelo utilizador.'
    await session.save()

    await notificationService.create({
      user: ensureRefId(session.adminUser, 'adminUser'),
      type: 'mention',
      triggeredBy: String(targetUserId),
      targetType: 'assisted_session',
      targetId: session.id,
      message: 'Sessao assistida revogada pelo utilizador.',
    })

    return {
      changed: true,
      session: mapSession(session),
    }
  }

  async validateActiveClaim(claim: AssistedSessionTokenPayload, authenticatedUserId: string) {
    if (claim.targetUserId !== authenticatedUserId) {
      throw new AssistedSessionServiceError(401, 'Sessao assistida invalida para este utilizador.')
    }

    const sessionId = toObjectId(claim.sessionId, 'sessionId')
    const adminUserId = toObjectId(claim.adminUserId, 'adminUserId')
    const targetUserId = toObjectId(claim.targetUserId, 'targetUserId')

    const session = await AssistedSession.findOne({
      _id: sessionId,
      adminUser: adminUserId,
      targetUser: targetUserId,
      status: 'active',
    })

    if (!session) {
      throw new AssistedSessionServiceError(401, 'Sessao assistida nao encontrada ou inativa.')
    }

    const now = new Date()
    const claimExpiry = new Date(claim.expiresAt)
    const sessionExpiry = session.sessionExpiresAt

    if (Number.isNaN(claimExpiry.getTime())) {
      throw new AssistedSessionServiceError(401, 'Sessao assistida com expiracao invalida.')
    }

    if (!sessionExpiry || sessionExpiry <= now || claimExpiry <= now) {
      session.status = 'expired'
      await session.save()
      throw new AssistedSessionServiceError(401, 'Sessao assistida expirada.')
    }

    return {
      sessionId: session.id,
      adminUserId: String(adminUserId),
      targetUserId: String(targetUserId),
      scope: session.scope,
      expiresAt: sessionExpiry.toISOString(),
    }
  }

  async recordRequestAudit(input: {
    sessionId: string
    adminUserId: string
    targetUserId: string
    method: string
    path: string
    statusCode: number
    requestId?: string
    ip?: string
    userAgent?: string
    metadata?: Record<string, unknown>
  }) {
    const { assistedSessionAuditService } = await import('./assistedSessionAudit.service')
    await assistedSessionAuditService.record({
      sessionId: input.sessionId,
      adminUserId: input.adminUserId,
      targetUserId: input.targetUserId,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode,
      outcome: toOutcome(input.statusCode),
      requestId: input.requestId,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: input.metadata,
    })
  }
}

export const assistedSessionService = new AssistedSessionService()
