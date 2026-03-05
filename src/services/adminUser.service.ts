import mongoose from 'mongoose'
import {
  CreatorOperationalAction,
  IUser,
  User,
  UserAccountStatus,
  UserRole,
} from '../models/User'
import { ADMIN_SCOPES, ADMIN_SCOPE_PROFILES, AdminScope } from '../admin/permissions'
import { UserModerationEvent } from '../models/UserModerationEvent'
import { creatorTrustService } from './creatorTrust.service'

export type AdminUserSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'lastLoginAt'
  | 'lastActiveAt'
  | 'username'
  | 'email'

export interface AdminUserFilters {
  search?: string
  role?: UserRole
  accountStatus?: UserAccountStatus
  adminReadOnly?: boolean
  activeSinceDays?: number
}

export interface AdminUserListOptions {
  page?: number
  limit?: number
  sortBy?: AdminUserSortField
  sortOrder?: 'asc' | 'desc'
}

export interface AdminUserActionInput {
  actorId: string
  targetUserId: string
  reason: string
  note?: string
}

export interface AdminCreatorControlInput extends AdminUserActionInput {
  action: CreatorOperationalAction
  cooldownHours?: number
}

export interface AdminPermissionSnapshot {
  adminReadOnly: boolean
  adminScopes: AdminScope[]
}

export interface AdminUpdatePermissionsInput extends AdminUserActionInput {
  adminReadOnly: boolean
  adminScopes?: string[]
  profile?: string
}

export class AdminUserServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 25
const DEFAULT_PAGE = 1
const MAX_COOLDOWN_HOURS = 24 * 30
const VALID_ADMIN_SCOPE_SET = new Set<string>(ADMIN_SCOPES)

const normalizePage = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_PAGE
  return Math.floor(value)
}

const normalizeLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(value), MAX_LIMIT)
}

const toObjectId = (rawId: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    throw new AdminUserServiceError(400, `${fieldName} invalido.`)
  }

  return new mongoose.Types.ObjectId(rawId)
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isAllowedSortField = (value?: string): value is AdminUserSortField => {
  return (
    value === 'createdAt' ||
    value === 'updatedAt' ||
    value === 'lastLoginAt' ||
    value === 'lastActiveAt' ||
    value === 'username' ||
    value === 'email'
  )
}

const sortAdminScopes = (scopes: AdminScope[]): AdminScope[] =>
  [...scopes].sort((left, right) => left.localeCompare(right))

const normalizeAdminScopes = (scopes?: string[] | null): AdminScope[] => {
  if (!Array.isArray(scopes) || scopes.length === 0) return []

  const unique = new Set<AdminScope>()
  for (const scope of scopes) {
    if (!VALID_ADMIN_SCOPE_SET.has(scope)) continue
    unique.add(scope as AdminScope)
  }

  return sortAdminScopes([...unique])
}

const resolveProfileScopes = (profileRaw?: string): { profile: string; scopes: AdminScope[] } | null => {
  if (typeof profileRaw !== 'string' || profileRaw.trim().length === 0) return null

  const profile = profileRaw.trim()
  const scopes = ADMIN_SCOPE_PROFILES[profile]
  if (!Array.isArray(scopes)) return null

  return {
    profile,
    scopes: sortAdminScopes([...scopes]),
  }
}

const areScopesEqual = (left: AdminScope[], right: AdminScope[]): boolean => {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

export class AdminUserService {
  async listUsers(filters: AdminUserFilters = {}, options: AdminUserListOptions = {}) {
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit

    const andClauses: Record<string, unknown>[] = []

    if (filters.search && filters.search.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegExp(filters.search.trim()), 'i')
      andClauses.push({
        $or: [{ name: searchRegex }, { username: searchRegex }, { email: searchRegex }],
      })
    }

    if (filters.role) {
      andClauses.push({ role: filters.role })
    }

    if (filters.accountStatus) {
      andClauses.push({ accountStatus: filters.accountStatus })
    }

    if (typeof filters.adminReadOnly === 'boolean') {
      andClauses.push({ adminReadOnly: filters.adminReadOnly })
    }

    if (filters.activeSinceDays && filters.activeSinceDays > 0) {
      const sinceDate = new Date(Date.now() - filters.activeSinceDays * 24 * 60 * 60 * 1000)
      andClauses.push({
        $or: [{ lastActiveAt: { $gte: sinceDate } }, { lastLoginAt: { $gte: sinceDate } }],
      })
    }

    const query = andClauses.length === 0 ? {} : { $and: andClauses }
    const sortField: AdminUserSortField = isAllowedSortField(options.sortBy)
      ? options.sortBy
      : 'createdAt'
    const sortDirection: 1 | -1 = options.sortOrder === 'asc' ? 1 : -1
    const sortClause: Record<string, 1 | -1> = { [sortField]: sortDirection }

    const [items, total] = await Promise.all([
      User.find(query)
        .sort(sortClause)
        .skip(skip)
        .limit(limit)
        .select(
          'email name username avatar role accountStatus adminReadOnly adminScopes statusReason statusChangedAt statusChangedBy creatorControls tokenVersion lastForcedLogoutAt lastLoginAt lastActiveAt createdAt updatedAt'
        )
        .populate('statusChangedBy', 'name username email role')
        .populate('creatorControls.updatedBy', 'name username email role')
        .lean(),
      User.countDocuments(query),
    ])

    const creatorTrustSignals = await creatorTrustService.getSignalsForCreators(
      items.filter((user) => user.role === 'creator').map((user) => String(user._id))
    )

    return {
      items: items.map((user) => ({
        id: String(user._id),
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
        statusChangedBy: user.statusChangedBy ?? null,
        creatorControls: this.mapCreatorControls(user.creatorControls),
        trustSignals:
          user.role === 'creator' ? creatorTrustSignals.get(String(user._id)) ?? null : null,
        tokenVersion: user.tokenVersion,
        lastForcedLogoutAt: user.lastForcedLogoutAt ?? null,
        lastLoginAt: user.lastLoginAt ?? null,
        lastActiveAt: user.lastActiveAt ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async updateAdminPermissions(input: AdminUpdatePermissionsInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const targetUserId = toObjectId(input.targetUserId, 'targetUserId')

    if (actorId.equals(targetUserId)) {
      throw new AdminUserServiceError(
        403,
        'Nao podes alterar as tuas proprias permissoes administrativas.'
      )
    }

    const [actorUser, targetUser] = await Promise.all([
      User.findById(actorId).select('role'),
      User.findById(targetUserId).select(
        'email name username avatar role accountStatus adminReadOnly adminScopes statusReason statusChangedAt statusChangedBy creatorControls tokenVersion lastForcedLogoutAt lastLoginAt lastActiveAt createdAt updatedAt'
      ),
    ])

    if (!actorUser || actorUser.role !== 'admin') {
      throw new AdminUserServiceError(403, 'Apenas admins podem alterar permissoes admin.')
    }

    if (!targetUser) {
      throw new AdminUserServiceError(404, 'Utilizador alvo nao encontrado.')
    }

    if (targetUser.role !== 'admin') {
      throw new AdminUserServiceError(409, 'Atualizacao de permissoes aplica-se apenas a contas admin.')
    }

    const resolvedProfile = resolveProfileScopes(input.profile)
    if (input.profile && !resolvedProfile) {
      throw new AdminUserServiceError(400, 'Perfil admin invalido para atribuicao de scopes.')
    }

    const normalizedScopes = resolvedProfile
      ? resolvedProfile.scopes
      : normalizeAdminScopes(input.adminScopes)

    if (normalizedScopes.length === 0) {
      throw new AdminUserServiceError(
        400,
        'Pelo menos um scope admin valido e obrigatorio para atualizar permissoes.'
      )
    }

    if (
      Array.isArray(input.adminScopes) &&
      input.adminScopes.some((scope) => !VALID_ADMIN_SCOPE_SET.has(scope))
    ) {
      throw new AdminUserServiceError(400, 'Payload contem scopes admin invalidos.')
    }

    const before = this.mapPermissionSnapshot(targetUser)
    const after: AdminPermissionSnapshot = {
      adminReadOnly: input.adminReadOnly,
      adminScopes: normalizedScopes,
    }

    const changed =
      before.adminReadOnly !== after.adminReadOnly ||
      !areScopesEqual(before.adminScopes, after.adminScopes)

    if (changed) {
      targetUser.adminReadOnly = after.adminReadOnly
      targetUser.adminScopes = after.adminScopes
      await targetUser.save()
    }

    const refreshedUser = changed
      ? await User.findById(targetUserId).select(
          'email name username avatar role accountStatus adminReadOnly adminScopes statusReason statusChangedAt statusChangedBy creatorControls tokenVersion lastForcedLogoutAt lastLoginAt lastActiveAt createdAt updatedAt'
        )
      : targetUser

    if (!refreshedUser) {
      throw new AdminUserServiceError(404, 'Utilizador alvo nao encontrado apos atualizacao.')
    }

    return {
      changed,
      profile: resolvedProfile?.profile ?? null,
      before,
      after,
      user: refreshedUser,
    }
  }

  async updateAccountStatus(input: AdminUserActionInput & { nextStatus: UserAccountStatus }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const targetUserId = toObjectId(input.targetUserId, 'targetUserId')

    if (actorId.equals(targetUserId)) {
      throw new AdminUserServiceError(400, 'Nao podes alterar o estado da tua propria conta.')
    }

    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      throw new AdminUserServiceError(404, 'Utilizador alvo nao encontrado.')
    }

    if (targetUser.role === 'admin') {
      throw new AdminUserServiceError(403, 'Acoes de sancao em contas admin nao sao permitidas.')
    }

    const previousStatus = targetUser.accountStatus

    if (previousStatus === input.nextStatus) {
      return {
        changed: false,
        fromStatus: previousStatus,
        user: targetUser,
      }
    }

    const previousTokenVersion = targetUser.tokenVersion
    const now = new Date()

    targetUser.accountStatus = input.nextStatus
    targetUser.statusReason = input.reason
    targetUser.statusChangedAt = now
    targetUser.statusChangedBy = actorId
    targetUser.tokenVersion = previousTokenVersion + 1
    targetUser.lastForcedLogoutAt = now
    targetUser.lastActiveAt = now

    await targetUser.save()

    await UserModerationEvent.create({
      user: targetUserId,
      actor: actorId,
      action: 'status_change',
      fromStatus: previousStatus,
      toStatus: input.nextStatus,
      reason: input.reason,
      note: input.note ?? null,
      metadata: {
        tokenVersionBefore: previousTokenVersion,
        tokenVersionAfter: targetUser.tokenVersion,
      },
    })

    return {
      changed: true,
      fromStatus: previousStatus,
      user: targetUser,
    }
  }

  async forceLogout(input: AdminUserActionInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const targetUserId = toObjectId(input.targetUserId, 'targetUserId')

    if (actorId.equals(targetUserId)) {
      throw new AdminUserServiceError(400, 'Usa o logout normal para terminar a tua propria sessao.')
    }

    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      throw new AdminUserServiceError(404, 'Utilizador alvo nao encontrado.')
    }

    if (targetUser.role === 'admin') {
      throw new AdminUserServiceError(
        403,
        'Force logout em contas admin nao e permitido neste nivel de permissao.'
      )
    }

    const previousTokenVersion = targetUser.tokenVersion
    const now = new Date()

    targetUser.tokenVersion = previousTokenVersion + 1
    targetUser.lastForcedLogoutAt = now
    targetUser.lastActiveAt = now

    await targetUser.save()

    await UserModerationEvent.create({
      user: targetUserId,
      actor: actorId,
      action: 'force_logout',
      fromStatus: targetUser.accountStatus,
      toStatus: targetUser.accountStatus,
      reason: input.reason,
      note: input.note ?? null,
      metadata: {
        tokenVersionBefore: previousTokenVersion,
        tokenVersionAfter: targetUser.tokenVersion,
      },
    })

    return targetUser
  }

  async addInternalNote(input: AdminUserActionInput & { note: string }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const targetUserId = toObjectId(input.targetUserId, 'targetUserId')

    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      throw new AdminUserServiceError(404, 'Utilizador alvo nao encontrado.')
    }

    const event = await UserModerationEvent.create({
      user: targetUserId,
      actor: actorId,
      action: 'internal_note',
      fromStatus: targetUser.accountStatus,
      toStatus: targetUser.accountStatus,
      reason: input.reason,
      note: input.note,
      metadata: null,
    })

    return event
  }

  async applyCreatorControl(input: AdminCreatorControlInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const targetUserId = toObjectId(input.targetUserId, 'targetUserId')

    if (actorId.equals(targetUserId)) {
      throw new AdminUserServiceError(
        400,
        'Nao podes alterar os controlos operacionais da tua propria conta.'
      )
    }

    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      throw new AdminUserServiceError(404, 'Utilizador alvo nao encontrado.')
    }

    if (targetUser.role !== 'creator') {
      throw new AdminUserServiceError(409, 'Controlos operacionais aplicam-se apenas a creators.')
    }

    const before = this.mapCreatorControls(targetUser.creatorControls)
    const now = new Date()
    const controls = targetUser.creatorControls ?? {
      creationBlocked: false,
      publishingBlocked: false,
    }

    if (input.action === 'set_cooldown') {
      const cooldownHours = input.cooldownHours
      if (!cooldownHours || !Number.isFinite(cooldownHours) || cooldownHours <= 0) {
        throw new AdminUserServiceError(400, 'cooldownHours obrigatorio para set_cooldown.')
      }

      const boundedCooldownHours = Math.min(Math.floor(cooldownHours), MAX_COOLDOWN_HOURS)
      controls.cooldownUntil = new Date(now.getTime() + boundedCooldownHours * 60 * 60 * 1000)
    }

    if (input.action === 'clear_cooldown') {
      controls.cooldownUntil = undefined
      targetUser.set('creatorControls.cooldownUntil', null)
    }

    if (input.action === 'block_creation') {
      controls.creationBlocked = true
      controls.creationBlockedReason = input.reason
    }

    if (input.action === 'unblock_creation') {
      controls.creationBlocked = false
      controls.creationBlockedReason = undefined
      targetUser.set('creatorControls.creationBlockedReason', null)
    }

    if (input.action === 'block_publishing') {
      controls.publishingBlocked = true
      controls.publishingBlockedReason = input.reason
    }

    if (input.action === 'unblock_publishing') {
      controls.publishingBlocked = false
      controls.publishingBlockedReason = undefined
      targetUser.set('creatorControls.publishingBlockedReason', null)
    }

    if (input.action === 'suspend_creator_ops') {
      controls.creationBlocked = true
      controls.creationBlockedReason = input.reason
      controls.publishingBlocked = true
      controls.publishingBlockedReason = input.reason
    }

    if (input.action === 'restore_creator_ops') {
      controls.creationBlocked = false
      controls.creationBlockedReason = undefined
      controls.publishingBlocked = false
      controls.publishingBlockedReason = undefined
      controls.cooldownUntil = undefined
      targetUser.set('creatorControls.creationBlockedReason', null)
      targetUser.set('creatorControls.publishingBlockedReason', null)
      targetUser.set('creatorControls.cooldownUntil', null)
    }

    controls.updatedAt = now
    controls.updatedBy = actorId
    targetUser.creatorControls = controls

    await targetUser.save()
    await targetUser.populate('creatorControls.updatedBy', 'name username email role')

    const after = this.mapCreatorControls(targetUser.creatorControls)

    await UserModerationEvent.create({
      user: targetUserId,
      actor: actorId,
      action: 'creator_control',
      fromStatus: targetUser.accountStatus,
      toStatus: targetUser.accountStatus,
      reason: input.reason,
      note: input.note ?? null,
      metadata: {
        creatorControlAction: input.action,
        cooldownHours: input.cooldownHours ?? null,
        before,
        after,
      },
    })

    return {
      action: input.action,
      user: targetUser,
      creatorControls: after,
    }
  }

  async listHistory(targetUserIdRaw: string, options: { page?: number; limit?: number } = {}) {
    const targetUserId = toObjectId(targetUserIdRaw, 'targetUserId')
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      UserModerationEvent.find({ user: targetUserId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name username email role')
        .lean(),
      UserModerationEvent.countDocuments({ user: targetUserId }),
    ])

    return {
      items: items.map((item) => ({
        id: String(item._id),
        user: String(item.user),
        actor: item.actor,
        action: item.action,
        fromStatus: item.fromStatus ?? null,
        toStatus: item.toStatus ?? null,
        reason: item.reason,
        note: item.note ?? null,
        metadata: item.metadata ?? null,
        createdAt: item.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getCreatorTrustProfile(targetUserIdRaw: string) {
    const targetUserId = toObjectId(targetUserIdRaw, 'targetUserId')
    const user = await User.findById(targetUserId)
      .select(
        'email name username avatar role accountStatus adminReadOnly adminScopes statusReason statusChangedAt statusChangedBy creatorControls tokenVersion lastForcedLogoutAt lastLoginAt lastActiveAt createdAt updatedAt'
      )
      .populate('statusChangedBy', 'name username email role')
      .populate('creatorControls.updatedBy', 'name username email role')
      .lean()

    if (!user) {
      throw new AdminUserServiceError(404, 'Utilizador alvo nao encontrado.')
    }

    if (user.role !== 'creator') {
      throw new AdminUserServiceError(409, 'Trust profile aplica-se apenas a creators.')
    }

    const trustSignals = await creatorTrustService.getSignalsForCreators([String(user._id)])

    return {
      user: {
        id: String(user._id),
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
        statusChangedBy: user.statusChangedBy ?? null,
        creatorControls: this.mapCreatorControls(user.creatorControls),
        tokenVersion: user.tokenVersion,
        lastForcedLogoutAt: user.lastForcedLogoutAt ?? null,
        lastLoginAt: user.lastLoginAt ?? null,
        lastActiveAt: user.lastActiveAt ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      trustSignals: trustSignals.get(String(user._id)) ?? null,
    }
  }

  private mapPermissionSnapshot(user: Pick<IUser, 'adminReadOnly' | 'adminScopes'>): AdminPermissionSnapshot {
    return {
      adminReadOnly: Boolean(user.adminReadOnly),
      adminScopes: normalizeAdminScopes(user.adminScopes),
    }
  }

  private mapCreatorControls(creatorControls: any) {
    return {
      creationBlocked: Boolean(creatorControls?.creationBlocked),
      creationBlockedReason:
        typeof creatorControls?.creationBlockedReason === 'string'
          ? creatorControls.creationBlockedReason
          : null,
      publishingBlocked: Boolean(creatorControls?.publishingBlocked),
      publishingBlockedReason:
        typeof creatorControls?.publishingBlockedReason === 'string'
          ? creatorControls.publishingBlockedReason
          : null,
      cooldownUntil: creatorControls?.cooldownUntil ?? null,
      updatedAt: creatorControls?.updatedAt ?? null,
      updatedBy: creatorControls?.updatedBy ?? null,
    }
  }
}

export const adminUserService = new AdminUserService()
