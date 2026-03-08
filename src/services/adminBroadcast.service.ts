import mongoose, { FilterQuery } from 'mongoose'
import {
  AdminBroadcast,
  AdminBroadcastChannel,
  AdminBroadcastSegment,
  AdminBroadcastStatus,
  IAdminBroadcast,
} from '../models/AdminBroadcast'
import { Notification } from '../models/Notification'
import { User, UserAccountStatus, UserRole } from '../models/User'
import { resolvePagination } from '../utils/pagination'

const VALID_ROLES: UserRole[] = ['visitor', 'free', 'premium', 'creator', 'admin']
const VALID_ACCOUNT_STATUSES: UserAccountStatus[] = ['active', 'suspended', 'banned']
const VALID_STATUSES: AdminBroadcastStatus[] = ['draft', 'approved', 'sent', 'failed', 'canceled']
const VALID_CHANNELS: AdminBroadcastChannel[] = ['in_app']
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const INSERT_BATCH_SIZE = 500
const MAX_SAMPLE_SIZE = 20
const MASS_APPROVAL_MIN_RECIPIENTS = (() => {
  const parsed = Number.parseInt(process.env.ADMIN_BROADCAST_MASS_APPROVAL_MIN_RECIPIENTS ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 500
  return parsed
})()

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toDateOrNull = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

const toPositiveIntOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = Math.floor(value)
    if (parsed > 0) return parsed
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

const toObjectId = (rawId: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    throw new AdminBroadcastServiceError(400, `${fieldName} invalido.`)
  }
  return new mongoose.Types.ObjectId(rawId)
}

const resolveAnyId = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  if (value instanceof mongoose.Types.ObjectId) return String(value)
  if (typeof value === 'object') {
    const record = value as { id?: unknown; _id?: unknown }
    if (typeof record.id === 'string' && record.id.trim().length > 0) return record.id.trim()
    if (typeof record._id === 'string' && record._id.trim().length > 0) return record._id.trim()
    if (record._id instanceof mongoose.Types.ObjectId) return String(record._id)
  }
  return null
}

const uniqueStringArray = <T extends string>(values: T[]): T[] => [...new Set(values)]

const isValidStatus = (value: unknown): value is AdminBroadcastStatus =>
  typeof value === 'string' && VALID_STATUSES.includes(value as AdminBroadcastStatus)

const isValidChannel = (value: unknown): value is AdminBroadcastChannel =>
  typeof value === 'string' && VALID_CHANNELS.includes(value as AdminBroadcastChannel)

const isValidRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && VALID_ROLES.includes(value as UserRole)

const isValidAccountStatus = (value: unknown): value is UserAccountStatus =>
  typeof value === 'string' && VALID_ACCOUNT_STATUSES.includes(value as UserAccountStatus)

const parseRoles = (value: unknown): UserRole[] => {
  if (!Array.isArray(value)) return []
  const roles = value.filter((item): item is UserRole => isValidRole(item))
  return uniqueStringArray(roles)
}

const parseAccountStatuses = (value: unknown): UserAccountStatus[] => {
  if (!Array.isArray(value)) return []
  const statuses = value.filter((item): item is UserAccountStatus => isValidAccountStatus(item))
  return uniqueStringArray(statuses)
}

const parseObjectIdArray = (value: unknown): mongoose.Types.ObjectId[] => {
  if (!Array.isArray(value)) return []
  const parsed = value
    .map((item) => {
      if (typeof item === 'string' && mongoose.Types.ObjectId.isValid(item)) {
        return new mongoose.Types.ObjectId(item)
      }
      if (item instanceof mongoose.Types.ObjectId) return item
      return null
    })
    .filter((item): item is mongoose.Types.ObjectId => item instanceof mongoose.Types.ObjectId)

  const unique = new Map<string, mongoose.Types.ObjectId>()
  for (const item of parsed) unique.set(String(item), item)
  return Array.from(unique.values())
}

const mapActor = (
  value: unknown
): { id: string; name?: string; username?: string; email?: string; role?: string } | null => {
  if (!value || typeof value !== 'object') return null
  const actor = value as {
    _id?: unknown
    id?: unknown
    name?: unknown
    username?: unknown
    email?: unknown
    role?: unknown
  }

  const id =
    typeof actor._id === 'string'
      ? actor._id
      : actor._id instanceof mongoose.Types.ObjectId
        ? String(actor._id)
        : typeof actor.id === 'string'
          ? actor.id
          : null
  if (!id) return null

  return {
    id,
    name: typeof actor.name === 'string' ? actor.name : undefined,
    username: typeof actor.username === 'string' ? actor.username : undefined,
    email: typeof actor.email === 'string' ? actor.email : undefined,
    role: typeof actor.role === 'string' ? actor.role : undefined,
  }
}

export class AdminBroadcastServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export interface AdminBroadcastListFilters {
  status?: AdminBroadcastStatus
  channel?: AdminBroadcastChannel
  search?: string
}

export interface AdminBroadcastListOptions {
  page?: number
  limit?: number
}

export interface AdminBroadcastSegmentInput {
  roles?: UserRole[]
  accountStatuses?: UserAccountStatus[]
  includeUsers?: string[]
  excludeUsers?: string[]
  lastActiveWithinDays?: number
}

export interface CreateAdminBroadcastInput {
  actorId: string
  title: string
  message: string
  channel?: AdminBroadcastChannel
  segment?: AdminBroadcastSegmentInput
  note?: string
}

export interface ApproveAdminBroadcastInput {
  actorId: string
  broadcastId: string
  reason: string
  note?: string
}

export interface SendAdminBroadcastInput {
  actorId: string
  broadcastId: string
  reason: string
  note?: string
}

export interface PreviewAdminBroadcastAudienceInput {
  segment?: AdminBroadcastSegmentInput
  sampleLimit?: number
}

export class AdminBroadcastService {
  async listBroadcasts(
    filters: AdminBroadcastListFilters = {},
    options: AdminBroadcastListOptions = {}
  ) {
    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const query: Record<string, unknown> = {}
    if (filters.status) query.status = filters.status
    if (filters.channel) query.channel = filters.channel

    const search = toStringOrNull(filters.search)
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      query.$or = [{ title: regex }, { message: regex }]
    }

    const [rows, total, statusRows] = await Promise.all([
      AdminBroadcast.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name username email role')
        .populate('updatedBy', 'name username email role')
        .populate('approval.approvedBy', 'name username email role')
        .lean(),
      AdminBroadcast.countDocuments(query),
      AdminBroadcast.aggregate<{ _id: AdminBroadcastStatus; count: number }>([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ])

    const summary = {
      draft: 0,
      approved: 0,
      sent: 0,
      failed: 0,
      canceled: 0,
      total,
    }
    for (const row of statusRows) {
      if (row._id in summary) {
        summary[row._id] = row.count
      }
    }

    return {
      items: rows.map((row) => this.mapBroadcast(row)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      summary,
    }
  }

  async getBroadcast(broadcastIdRaw: string) {
    const broadcast = await this.findBroadcast(broadcastIdRaw)
    return this.mapBroadcast(broadcast.toObject(), true)
  }

  async previewAudience(input: PreviewAdminBroadcastAudienceInput = {}) {
    const segment = this.normalizeSegment(input.segment)
    const sampleLimit = Math.min(
      MAX_SAMPLE_SIZE,
      Math.max(1, toPositiveIntOrNull(input.sampleLimit) ?? 10)
    )
    const query = this.buildAudienceQuery(segment)

    const [estimatedRecipients, recipients] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('name username email role accountStatus lastActiveAt createdAt')
        .sort({ lastActiveAt: -1, createdAt: -1 })
        .limit(sampleLimit)
        .lean(),
    ])

    return {
      segment: this.mapSegment(segment),
      estimatedRecipients,
      approvalRequired: estimatedRecipients >= MASS_APPROVAL_MIN_RECIPIENTS,
      massApprovalMinRecipients: MASS_APPROVAL_MIN_RECIPIENTS,
      sample: recipients.map((user) => ({
        id: resolveAnyId(user._id),
        name: typeof user.name === 'string' ? user.name : null,
        username: typeof user.username === 'string' ? user.username : null,
        email: typeof user.email === 'string' ? user.email : null,
        role: isValidRole(user.role) ? user.role : null,
        accountStatus: isValidAccountStatus(user.accountStatus) ? user.accountStatus : null,
        lastActiveAt: toDateOrNull(user.lastActiveAt)?.toISOString() ?? null,
        createdAt: toDateOrNull(user.createdAt)?.toISOString() ?? null,
      })),
    }
  }

  async createBroadcast(input: CreateAdminBroadcastInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const title = this.assertTitle(input.title)
    const message = this.assertMessage(input.message)
    const note = toStringOrNull(input.note)
    const channel = isValidChannel(input.channel) ? input.channel : 'in_app'
    const segment = this.normalizeSegment(input.segment)
    const audienceEstimate = await User.countDocuments(this.buildAudienceQuery(segment))
    const now = new Date()
    const approvalRequired = audienceEstimate >= MASS_APPROVAL_MIN_RECIPIENTS

    const broadcast = await AdminBroadcast.create({
      title,
      message,
      channel,
      status: 'draft',
      segment,
      audienceEstimate,
      approval: {
        required: approvalRequired,
        approvedAt: null,
        approvedBy: null,
        reason: null,
      },
      delivery: {
        attempted: 0,
        sent: 0,
        failed: 0,
        sentAt: null,
        lastError: null,
      },
      createdBy: actorId,
      updatedBy: actorId,
      version: 1,
      history: [
        {
          action: 'created',
          changedBy: actorId,
          reason: 'broadcast_created',
          note,
          metadata: {
            approvalRequired,
            audienceEstimate,
          },
          changedAt: now,
        },
      ],
    })

    await broadcast.populate('createdBy', 'name username email role')
    await broadcast.populate('updatedBy', 'name username email role')
    await broadcast.populate('approval.approvedBy', 'name username email role')
    return this.mapBroadcast(broadcast.toObject(), true)
  }

  async approveBroadcast(input: ApproveAdminBroadcastInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const reason = this.assertReason(input.reason)
    const note = toStringOrNull(input.note)
    const broadcast = await this.findBroadcast(input.broadcastId)

    if (broadcast.status === 'sent') {
      throw new AdminBroadcastServiceError(409, 'Broadcast ja enviado.')
    }
    if (broadcast.status === 'canceled') {
      throw new AdminBroadcastServiceError(409, 'Broadcast cancelado.')
    }
    if (broadcast.approval.required && String(broadcast.createdBy) === String(actorId)) {
      throw new AdminBroadcastServiceError(
        409,
        'Broadcast massivo requer aprovacao por admin diferente de quem criou.'
      )
    }

    const now = new Date()
    broadcast.status = 'approved'
    broadcast.approval.approvedAt = now
    broadcast.approval.approvedBy = actorId
    broadcast.approval.reason = reason
    broadcast.updatedBy = actorId
    broadcast.version += 1
    broadcast.history.push({
      action: 'approved',
      changedBy: actorId,
      reason,
      note,
      metadata: {
        approvalRequired: broadcast.approval.required,
      },
      changedAt: now,
    })

    await broadcast.save()
    await broadcast.populate('createdBy', 'name username email role')
    await broadcast.populate('updatedBy', 'name username email role')
    await broadcast.populate('approval.approvedBy', 'name username email role')
    return this.mapBroadcast(broadcast.toObject(), true)
  }

  async sendBroadcast(input: SendAdminBroadcastInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const reason = this.assertReason(input.reason)
    const note = toStringOrNull(input.note)
    const broadcast = await this.findBroadcast(input.broadcastId)

    if (broadcast.status === 'sent') {
      throw new AdminBroadcastServiceError(409, 'Broadcast ja enviado.')
    }
    if (broadcast.status === 'canceled') {
      throw new AdminBroadcastServiceError(409, 'Broadcast cancelado.')
    }

    const query = this.buildAudienceQuery(broadcast.segment)
    const recipients = await User.find(query).select('_id').lean()
    const recipientIds = recipients
      .map((item) => resolveAnyId(item._id))
      .filter((item): item is string => typeof item === 'string')

    if (recipientIds.length === 0) {
      throw new AdminBroadcastServiceError(409, 'Sem audiencia elegivel para envio.')
    }

    const requiresApproval =
      broadcast.approval.required || recipientIds.length >= MASS_APPROVAL_MIN_RECIPIENTS
    if (requiresApproval && !broadcast.approval.approvedBy) {
      throw new AdminBroadcastServiceError(
        409,
        'Broadcast massivo requer aprovacao antes do envio.'
      )
    }
    if (requiresApproval && !broadcast.approval.required) {
      broadcast.approval.required = true
    }

    const now = new Date()
    broadcast.updatedBy = actorId
    broadcast.version += 1
    broadcast.history.push({
      action: 'send_started',
      changedBy: actorId,
      reason,
      note,
      metadata: {
        attempted: recipientIds.length,
      },
      changedAt: now,
    })

    let sent = 0
    let failed = 0
    let firstError: string | null = null

    for (let offset = 0; offset < recipientIds.length; offset += INSERT_BATCH_SIZE) {
      const slice = recipientIds.slice(offset, offset + INSERT_BATCH_SIZE)
      const payload = slice.map((userId) => ({
        user: new mongoose.Types.ObjectId(userId),
        type: 'content_published' as const,
        triggeredBy: actorId,
        targetType: 'admin_broadcast',
        targetId: broadcast._id,
        message: broadcast.message,
        metadata: {
          source: 'admin_broadcast',
          broadcastId: String(broadcast._id),
          title: broadcast.title,
          channel: broadcast.channel,
        },
      }))

      try {
        const inserted = await Notification.insertMany(payload, { ordered: false })
        sent += inserted.length
      } catch (error: unknown) {
        const errorRecord = error as {
          message?: unknown
          writeErrors?: Array<unknown>
          insertedDocs?: Array<unknown>
        }
        const insertedCount = Array.isArray(errorRecord.insertedDocs)
          ? errorRecord.insertedDocs.length
          : 0
        const writeErrorsCount = Array.isArray(errorRecord.writeErrors)
          ? errorRecord.writeErrors.length
          : Math.max(0, payload.length - insertedCount)
        sent += insertedCount
        failed += writeErrorsCount

        if (!firstError) {
          firstError =
            typeof errorRecord.message === 'string'
              ? errorRecord.message.slice(0, 500)
              : 'Falha desconhecida no envio de notificacoes.'
        }
      }
    }

    const attempted = recipientIds.length
    if (failed === 0 && sent < attempted) {
      failed = attempted - sent
    }

    broadcast.audienceEstimate = attempted
    broadcast.delivery.attempted = attempted
    broadcast.delivery.sent = sent
    broadcast.delivery.failed = failed
    broadcast.delivery.sentAt = now
    broadcast.delivery.lastError = firstError
    broadcast.status = failed > 0 ? 'failed' : 'sent'

    broadcast.history.push({
      action: failed > 0 ? 'failed' : 'sent',
      changedBy: actorId,
      reason,
      note,
      metadata: {
        attempted,
        sent,
        failed,
      },
      changedAt: now,
    })

    await broadcast.save()
    await broadcast.populate('createdBy', 'name username email role')
    await broadcast.populate('updatedBy', 'name username email role')
    await broadcast.populate('approval.approvedBy', 'name username email role')
    return this.mapBroadcast(broadcast.toObject(), true)
  }

  private assertTitle(value: unknown): string {
    const parsed = toStringOrNull(value)
    if (!parsed) throw new AdminBroadcastServiceError(400, 'Titulo obrigatorio.')
    if (parsed.length > 160) {
      throw new AdminBroadcastServiceError(400, 'Titulo excede limite de 160 caracteres.')
    }
    return parsed
  }

  private assertMessage(value: unknown): string {
    const parsed = toStringOrNull(value)
    if (!parsed) throw new AdminBroadcastServiceError(400, 'Mensagem obrigatoria.')
    if (parsed.length > 2000) {
      throw new AdminBroadcastServiceError(400, 'Mensagem excede limite de 2000 caracteres.')
    }
    return parsed
  }

  private assertReason(value: unknown): string {
    const parsed = toStringOrNull(value)
    if (!parsed) throw new AdminBroadcastServiceError(400, 'Motivo obrigatorio.')
    if (parsed.length > 500) {
      throw new AdminBroadcastServiceError(400, 'Motivo excede limite de 500 caracteres.')
    }
    return parsed
  }

  private normalizeSegment(rawSegment: AdminBroadcastSegmentInput | undefined): AdminBroadcastSegment {
    const segmentLike =
      rawSegment && typeof rawSegment === 'object'
        ? (rawSegment as Record<string, unknown>)
        : {}

    const roles = parseRoles(segmentLike.roles)
    const accountStatuses = parseAccountStatuses(segmentLike.accountStatuses)
    const includeUsers = parseObjectIdArray(segmentLike.includeUsers)
    const excludeUsers = parseObjectIdArray(segmentLike.excludeUsers)
    const lastActiveWithinDays = toPositiveIntOrNull(segmentLike.lastActiveWithinDays)

    return {
      roles,
      accountStatuses: accountStatuses.length > 0 ? accountStatuses : ['active'],
      includeUsers,
      excludeUsers,
      lastActiveWithinDays,
    }
  }

  private buildAudienceQuery(segment: AdminBroadcastSegment): FilterQuery<typeof User> {
    const clauses: Record<string, unknown>[] = []

    if (segment.roles.length > 0) {
      clauses.push({ role: { $in: segment.roles } })
    }
    if (segment.accountStatuses.length > 0) {
      clauses.push({ accountStatus: { $in: segment.accountStatuses } })
    }
    if (segment.includeUsers.length > 0) {
      clauses.push({ _id: { $in: segment.includeUsers } })
    }
    if (segment.excludeUsers.length > 0) {
      clauses.push({ _id: { $nin: segment.excludeUsers } })
    }
    if (segment.lastActiveWithinDays && segment.lastActiveWithinDays > 0) {
      const since = new Date(Date.now() - segment.lastActiveWithinDays * 24 * 60 * 60 * 1000)
      clauses.push({ lastActiveAt: { $gte: since } })
    }

    if (clauses.length === 0) return {}
    if (clauses.length === 1) return clauses[0]
    return { $and: clauses }
  }

  private async findBroadcast(broadcastIdRaw: string): Promise<IAdminBroadcast> {
    const broadcastId = toObjectId(broadcastIdRaw, 'broadcastId')
    const broadcast = await AdminBroadcast.findById(broadcastId)
      .populate('createdBy', 'name username email role')
      .populate('updatedBy', 'name username email role')
      .populate('approval.approvedBy', 'name username email role')
      .populate('history.changedBy', 'name username email role')

    if (!broadcast) {
      throw new AdminBroadcastServiceError(404, 'Broadcast nao encontrado.')
    }

    return broadcast
  }

  private mapSegment(value: unknown) {
    if (!value || typeof value !== 'object') {
      return {
        roles: [],
        accountStatuses: ['active'],
        includeUsers: [],
        excludeUsers: [],
        lastActiveWithinDays: null,
      }
    }

    const segment = value as {
      roles?: unknown
      accountStatuses?: unknown
      includeUsers?: unknown
      excludeUsers?: unknown
      lastActiveWithinDays?: unknown
    }

    const roles = Array.isArray(segment.roles)
      ? segment.roles.filter((item): item is UserRole => isValidRole(item))
      : []
    const accountStatuses = Array.isArray(segment.accountStatuses)
      ? segment.accountStatuses.filter((item): item is UserAccountStatus => isValidAccountStatus(item))
      : []
    const includeUsers = Array.isArray(segment.includeUsers)
      ? segment.includeUsers
          .map((item) => resolveAnyId(item))
          .filter((item): item is string => Boolean(item))
      : []
    const excludeUsers = Array.isArray(segment.excludeUsers)
      ? segment.excludeUsers
          .map((item) => resolveAnyId(item))
          .filter((item): item is string => Boolean(item))
      : []

    return {
      roles,
      accountStatuses: accountStatuses.length > 0 ? accountStatuses : ['active'],
      includeUsers,
      excludeUsers,
      lastActiveWithinDays: toPositiveIntOrNull(segment.lastActiveWithinDays),
    }
  }

  private mapBroadcast(
    broadcast: {
      _id?: unknown
      title?: unknown
      message?: unknown
      channel?: unknown
      status?: unknown
      segment?: unknown
      audienceEstimate?: unknown
      approval?: unknown
      delivery?: unknown
      createdBy?: unknown
      updatedBy?: unknown
      version?: unknown
      history?: unknown
      createdAt?: unknown
      updatedAt?: unknown
    },
    includeHistory = false
  ) {
    const historyRows = Array.isArray(broadcast.history) ? broadcast.history : []
    const approval =
      broadcast.approval && typeof broadcast.approval === 'object'
        ? (broadcast.approval as {
            required?: unknown
            approvedAt?: unknown
            approvedBy?: unknown
            reason?: unknown
          })
        : null
    const delivery =
      broadcast.delivery && typeof broadcast.delivery === 'object'
        ? (broadcast.delivery as {
            attempted?: unknown
            sent?: unknown
            failed?: unknown
            sentAt?: unknown
            lastError?: unknown
          })
        : null

    return {
      id: resolveAnyId(broadcast._id),
      title: typeof broadcast.title === 'string' ? broadcast.title : '',
      message: typeof broadcast.message === 'string' ? broadcast.message : '',
      channel: isValidChannel(broadcast.channel) ? broadcast.channel : 'in_app',
      status: isValidStatus(broadcast.status) ? broadcast.status : 'draft',
      segment: this.mapSegment(broadcast.segment),
      audienceEstimate:
        typeof broadcast.audienceEstimate === 'number' ? Math.max(0, broadcast.audienceEstimate) : 0,
      approval: {
        required: approval?.required === true,
        approvedAt: toDateOrNull(approval?.approvedAt)?.toISOString() ?? null,
        approvedBy: mapActor(approval?.approvedBy),
        reason: typeof approval?.reason === 'string' ? approval.reason : null,
      },
      delivery: {
        attempted: typeof delivery?.attempted === 'number' ? Math.max(0, delivery.attempted) : 0,
        sent: typeof delivery?.sent === 'number' ? Math.max(0, delivery.sent) : 0,
        failed: typeof delivery?.failed === 'number' ? Math.max(0, delivery.failed) : 0,
        sentAt: toDateOrNull(delivery?.sentAt)?.toISOString() ?? null,
        lastError: typeof delivery?.lastError === 'string' ? delivery.lastError : null,
      },
      createdBy: mapActor(broadcast.createdBy),
      updatedBy: mapActor(broadcast.updatedBy),
      version: typeof broadcast.version === 'number' ? broadcast.version : 1,
      historyCount: historyRows.length,
      lastHistoryEntry:
        historyRows.length > 0 && typeof historyRows[historyRows.length - 1] === 'object'
          ? historyRows[historyRows.length - 1]
          : null,
      history: includeHistory
        ? historyRows
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
            .map((item) => ({
              action:
                typeof item.action === 'string' &&
                ['created', 'approved', 'send_started', 'sent', 'failed', 'canceled'].includes(
                  item.action
                )
                  ? item.action
                  : 'created',
              reason: typeof item.reason === 'string' ? item.reason : null,
              note: typeof item.note === 'string' ? item.note : null,
              metadata:
                item.metadata && typeof item.metadata === 'object'
                  ? (item.metadata as Record<string, unknown>)
                  : null,
              changedAt: toDateOrNull(item.changedAt)?.toISOString() ?? null,
              changedBy: mapActor(item.changedBy),
            }))
        : undefined,
      createdAt: toDateOrNull(broadcast.createdAt)?.toISOString() ?? null,
      updatedAt: toDateOrNull(broadcast.updatedAt)?.toISOString() ?? null,
    }
  }
}

export const adminBroadcastService = new AdminBroadcastService()
export const isValidAdminBroadcastStatus = isValidStatus
export const isValidAdminBroadcastChannel = isValidChannel
