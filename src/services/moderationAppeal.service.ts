import mongoose from 'mongoose'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Comment } from '../models/Comment'
import {
  ContentModerationEvent,
  IContentModerationEvent,
  ModeratableContentType,
} from '../models/ContentModerationEvent'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import {
  IModerationAppeal,
  ModerationAppeal,
  ModerationAppealReasonCategory,
  ModerationAppealSeverity,
  ModerationAppealStatus,
} from '../models/ModerationAppeal'
import { Podcast } from '../models/Podcast'
import { Rating } from '../models/Rating'
import { User } from '../models/User'
import { Video } from '../models/Video'
import { automatedModerationService } from './automatedModeration.service'
import { contentReportService } from './contentReport.service'
import { resolvePagination } from '../utils/pagination'

interface ContentOwnerModel {
  findById(id: string): any
}

const CONTENT_TYPES: ModeratableContentType[] = [
  'article',
  'video',
  'course',
  'live',
  'podcast',
  'book',
  'comment',
  'review',
]

const STATUSES: ModerationAppealStatus[] = [
  'open',
  'under_review',
  'accepted',
  'rejected',
  'closed',
]

const SEVERITIES: ModerationAppealSeverity[] = ['low', 'medium', 'high', 'critical']

const REASON_CATEGORIES: ModerationAppealReasonCategory[] = [
  'false_positive',
  'context_missing',
  'policy_dispute',
  'other',
]

const RESOLVED_STATUS_SET = new Set<ModerationAppealStatus>(['accepted', 'rejected', 'closed'])
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const MAX_SLA_HOURS = 168
const DEFAULT_SLA_HOURS = (() => {
  const parsed = Number.parseInt(process.env.MODERATION_APPEAL_DEFAULT_SLA_HOURS ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 48
  return Math.min(parsed, MAX_SLA_HOURS)
})()

const contentOwnerModelByType: Record<ModeratableContentType, ContentOwnerModel> = {
  article: Article as unknown as ContentOwnerModel,
  video: Video as unknown as ContentOwnerModel,
  course: Course as unknown as ContentOwnerModel,
  live: LiveEvent as unknown as ContentOwnerModel,
  podcast: Podcast as unknown as ContentOwnerModel,
  book: Book as unknown as ContentOwnerModel,
  comment: Comment as unknown as ContentOwnerModel,
  review: Rating as unknown as ContentOwnerModel,
}

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

const toObjectId = (rawId: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    throw new ModerationAppealServiceError(400, `${fieldName} invalido.`)
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

const isValidTransition = (
  currentStatus: ModerationAppealStatus,
  nextStatus: ModerationAppealStatus
): boolean => {
  if (currentStatus === nextStatus) return false
  if (currentStatus === 'open') {
    return (
      nextStatus === 'under_review' ||
      nextStatus === 'accepted' ||
      nextStatus === 'rejected' ||
      nextStatus === 'closed'
    )
  }
  if (currentStatus === 'under_review') {
    return nextStatus === 'accepted' || nextStatus === 'rejected' || nextStatus === 'closed'
  }
  if (currentStatus === 'accepted' || currentStatus === 'rejected') {
    return nextStatus === 'closed'
  }
  return false
}

const severityRank = (value: ModerationAppealSeverity): number => {
  if (value === 'critical') return 4
  if (value === 'high') return 3
  if (value === 'medium') return 2
  return 1
}

const maxSeverity = (
  left: ModerationAppealSeverity,
  right: ModerationAppealSeverity
): ModerationAppealSeverity => (severityRank(left) >= severityRank(right) ? left : right)

const toSlaHours = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const parsed = Math.floor(value)
  if (parsed <= 0) return fallback
  return Math.min(parsed, MAX_SLA_HOURS)
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

export const isValidModerationAppealStatus = (
  value: unknown
): value is ModerationAppealStatus =>
  typeof value === 'string' && STATUSES.includes(value as ModerationAppealStatus)

export const isValidModerationAppealSeverity = (
  value: unknown
): value is ModerationAppealSeverity =>
  typeof value === 'string' && SEVERITIES.includes(value as ModerationAppealSeverity)

export const isValidModerationAppealReasonCategory = (
  value: unknown
): value is ModerationAppealReasonCategory =>
  typeof value === 'string' && REASON_CATEGORIES.includes(value as ModerationAppealReasonCategory)

export class ModerationAppealServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export interface CreateModerationAppealInput {
  appellantId: string
  moderationEventId: string
  reasonCategory?: ModerationAppealReasonCategory
  reason: string
  note?: string
  slaHours?: number
}

export interface ListModerationAppealsFilters {
  status?: ModerationAppealStatus
  severity?: ModerationAppealSeverity
  contentType?: ModeratableContentType
  breachedSla?: boolean
  search?: string
}

export interface ListModerationAppealsOptions {
  page?: number
  limit?: number
}

export interface UpdateModerationAppealStatusInput {
  actorId: string
  appealId: string
  status: ModerationAppealStatus
  reason: string
  note?: string
}

export class ModerationAppealService {
  async createAppeal(input: CreateModerationAppealInput) {
    const appellantId = toObjectId(input.appellantId, 'appellantId')
    const moderationEventId = toObjectId(input.moderationEventId, 'moderationEventId')
    const reason = this.assertReason(input.reason)
    const note = toStringOrNull(input.note)
    const reasonCategory = isValidModerationAppealReasonCategory(input.reasonCategory)
      ? input.reasonCategory
      : 'other'

    const moderationEvent = await ContentModerationEvent.findById(moderationEventId).lean()
    if (!moderationEvent) {
      throw new ModerationAppealServiceError(404, 'Evento de moderacao nao encontrado.')
    }

    if (moderationEvent.toStatus === 'visible') {
      throw new ModerationAppealServiceError(
        409,
        'Nao e possivel abrir apelacao para evento sem restricao ativa.'
      )
    }

    const existing = await ModerationAppeal.findOne({ moderationEvent: moderationEventId }).lean()
    if (existing) {
      throw new ModerationAppealServiceError(
        409,
        `Ja existe apelacao para este evento (estado: ${existing.status}).`
      )
    }

    const targetOwnerId = await this.resolveTargetOwnerId(
      moderationEvent.contentType,
      moderationEvent.contentId
    )

    if (!targetOwnerId) {
      throw new ModerationAppealServiceError(
        404,
        'Conteudo alvo da moderacao nao encontrado para apelacao.'
      )
    }

    if (targetOwnerId !== String(appellantId)) {
      throw new ModerationAppealServiceError(
        403,
        'Apenas o owner do conteudo moderado pode abrir apelacao.'
      )
    }

    const severity = await this.deriveAppealSeverity(moderationEvent)
    const now = new Date()
    const slaHours = toSlaHours(input.slaHours, DEFAULT_SLA_HOURS)
    const dueAt = new Date(now.getTime() + slaHours * 60 * 60 * 1000)

    const created = await ModerationAppeal.create({
      moderationEvent: moderationEventId,
      contentType: moderationEvent.contentType,
      contentId: moderationEvent.contentId,
      appellant: appellantId,
      status: 'open',
      severity,
      reasonCategory,
      reason,
      note,
      slaHours,
      openedAt: now,
      dueAt,
      createdBy: appellantId,
      updatedBy: appellantId,
      version: 1,
      history: [
        {
          fromStatus: 'open',
          toStatus: 'open',
          changedBy: appellantId,
          reason: 'appeal_opened',
          note: null,
          changedAt: now,
        },
      ],
    })

    await created.populate('appellant', 'name username email role')
    await created.populate('createdBy', 'name username email role')
    await created.populate('updatedBy', 'name username email role')
    await created.populate('moderationEvent')

    return this.mapAppeal(created.toObject(), true)
  }

  async listMyAppeals(
    appellantIdRaw: string,
    filters: ListModerationAppealsFilters = {},
    options: ListModerationAppealsOptions = {}
  ) {
    const appellantId = toObjectId(appellantIdRaw, 'appellantId')
    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const query: Record<string, unknown> = {
      appellant: appellantId,
    }

    if (filters.status) query.status = filters.status
    if (filters.severity) query.severity = filters.severity
    if (filters.contentType) query.contentType = filters.contentType

    if (typeof filters.breachedSla === 'boolean') {
      const now = new Date()
      if (filters.breachedSla) {
        query.status = { $in: ['open', 'under_review'] }
        query.dueAt = { $lt: now }
      } else {
        query.$or = [
          { status: { $nin: ['open', 'under_review'] } },
          { dueAt: { $gte: now } },
        ]
      }
    }

    const [rows, total] = await Promise.all([
      ModerationAppeal.find(query)
        .sort({ openedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('appellant', 'name username email role')
        .populate('updatedBy', 'name username email role')
        .populate('moderationEvent')
        .lean(),
      ModerationAppeal.countDocuments(query),
    ])

    return {
      items: rows.map((row) => this.mapAppeal(row)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getMyAppeal(appellantIdRaw: string, appealIdRaw: string) {
    const appellantId = toObjectId(appellantIdRaw, 'appellantId')
    const appeal = await this.findAppeal(appealIdRaw)
    const appealAppellantId = resolveAnyId(appeal.appellant)

    if (!appealAppellantId || appealAppellantId !== String(appellantId)) {
      throw new ModerationAppealServiceError(403, 'Sem permissao para aceder a esta apelacao.')
    }

    return this.mapAppeal(appeal.toObject(), true)
  }

  async listAdminAppeals(
    filters: ListModerationAppealsFilters = {},
    options: ListModerationAppealsOptions = {}
  ) {
    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const query: Record<string, unknown> = {}
    if (filters.status) query.status = filters.status
    if (filters.severity) query.severity = filters.severity
    if (filters.contentType) query.contentType = filters.contentType

    if (typeof filters.breachedSla === 'boolean') {
      const now = new Date()
      if (filters.breachedSla) {
        query.status = { $in: ['open', 'under_review'] }
        query.dueAt = { $lt: now }
      } else {
        query.$or = [
          { status: { $nin: ['open', 'under_review'] } },
          { dueAt: { $gte: now } },
        ]
      }
    }

    const search = toStringOrNull(filters.search)
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')

      const matchedUsers = await User.find({
        $or: [{ name: regex }, { username: regex }, { email: regex }],
      })
        .select('_id')
        .limit(250)
        .lean()

      const userIds = matchedUsers
        .map((row) => {
          if (row._id instanceof mongoose.Types.ObjectId) return row._id
          if (typeof row._id === 'string' && mongoose.Types.ObjectId.isValid(row._id)) {
            return new mongoose.Types.ObjectId(row._id)
          }
          return null
        })
        .filter((item): item is mongoose.Types.ObjectId => item instanceof mongoose.Types.ObjectId)

      if (userIds.length === 0) {
        return {
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 1,
          },
          summary: {
            open: 0,
            underReview: 0,
            accepted: 0,
            rejected: 0,
            closed: 0,
            breachedSla: 0,
            total: 0,
          },
        }
      }
      query.appellant = { $in: userIds }
    }

    const now = new Date()
    const [rows, total, statusSummaryRows, breachedSla] = await Promise.all([
      ModerationAppeal.find(query)
        .sort({ dueAt: 1, openedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('appellant', 'name username email role')
        .populate('createdBy', 'name username email role')
        .populate('updatedBy', 'name username email role')
        .populate('moderationEvent')
        .lean(),
      ModerationAppeal.countDocuments(query),
      ModerationAppeal.aggregate<{ _id: ModerationAppealStatus; count: number }>([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ModerationAppeal.countDocuments({
        ...(query as Record<string, unknown>),
        status: { $in: ['open', 'under_review'] },
        dueAt: { $lt: now },
      }),
    ])

    const summary = {
      open: 0,
      underReview: 0,
      accepted: 0,
      rejected: 0,
      closed: 0,
      breachedSla,
      total,
    }

    for (const row of statusSummaryRows) {
      if (row._id === 'open') summary.open = row.count
      if (row._id === 'under_review') summary.underReview = row.count
      if (row._id === 'accepted') summary.accepted = row.count
      if (row._id === 'rejected') summary.rejected = row.count
      if (row._id === 'closed') summary.closed = row.count
    }

    return {
      items: rows.map((row) => this.mapAppeal(row)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      summary,
    }
  }

  async getAdminAppeal(appealIdRaw: string) {
    const appeal = await this.findAppeal(appealIdRaw)
    return this.mapAppeal(appeal.toObject(), true)
  }

  async updateAppealStatus(input: UpdateModerationAppealStatusInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const reason = this.assertReason(input.reason)
    const note = toStringOrNull(input.note)
    const appeal = await this.findAppeal(input.appealId)

    if (!isValidTransition(appeal.status, input.status)) {
      throw new ModerationAppealServiceError(
        409,
        `Transicao de estado invalida: ${appeal.status} -> ${input.status}.`
      )
    }

    const now = new Date()
    const previousStatus = appeal.status
    appeal.status = input.status
    appeal.updatedBy = actorId
    appeal.version += 1

    if (!appeal.firstResponseAt && input.status !== 'open') {
      appeal.firstResponseAt = now
    }

    if (RESOLVED_STATUS_SET.has(input.status)) {
      appeal.resolvedAt = now
    }

    appeal.history.push({
      fromStatus: previousStatus,
      toStatus: input.status,
      changedBy: actorId,
      reason,
      note,
      changedAt: now,
    })

    await appeal.save()
    await appeal.populate('appellant', 'name username email role')
    await appeal.populate('createdBy', 'name username email role')
    await appeal.populate('updatedBy', 'name username email role')
    await appeal.populate('moderationEvent')

    return this.mapAppeal(appeal.toObject(), true)
  }

  private assertReason(reasonRaw: unknown): string {
    const reason = toStringOrNull(reasonRaw)
    if (!reason) {
      throw new ModerationAppealServiceError(400, 'Motivo obrigatorio para esta operacao.')
    }
    if (reason.length > 500) {
      throw new ModerationAppealServiceError(400, 'Motivo excede limite de 500 caracteres.')
    }
    return reason
  }

  private async findAppeal(appealIdRaw: string): Promise<IModerationAppeal> {
    const appealId = toObjectId(appealIdRaw, 'appealId')
    const appeal = await ModerationAppeal.findById(appealId)
      .populate('appellant', 'name username email role')
      .populate('createdBy', 'name username email role')
      .populate('updatedBy', 'name username email role')
      .populate('history.changedBy', 'name username email role')
      .populate('moderationEvent')

    if (!appeal) {
      throw new ModerationAppealServiceError(404, 'Apelacao de moderacao nao encontrada.')
    }

    return appeal
  }

  private async resolveTargetOwnerId(
    contentType: ModeratableContentType,
    contentId: string
  ): Promise<string | null> {
    if (!CONTENT_TYPES.includes(contentType)) {
      throw new ModerationAppealServiceError(400, 'contentType invalido na apelacao.')
    }

    const model = contentOwnerModelByType[contentType]
    if (!model) return null

    if (!mongoose.Types.ObjectId.isValid(contentId)) return null

    if (contentType === 'comment' || contentType === 'review') {
      const target = await model.findById(contentId).select('user').lean()
      return resolveAnyId(target?.user)
    }

    const target = await model.findById(contentId).select('creator').lean()
    return resolveAnyId(target?.creator)
  }

  private async deriveAppealSeverity(
    moderationEvent: Pick<IContentModerationEvent, 'contentType' | 'contentId' | 'toStatus' | 'metadata' | 'action'>
  ): Promise<ModerationAppealSeverity> {
    let severity: ModerationAppealSeverity =
      moderationEvent.toStatus === 'hidden'
        ? 'high'
        : moderationEvent.toStatus === 'restricted'
          ? 'medium'
          : 'low'

    const [reportSignalsMap, automatedSignalsMap] = await Promise.all([
      contentReportService.getOpenReportSummaries([
        { contentType: moderationEvent.contentType, contentId: moderationEvent.contentId },
      ]),
      automatedModerationService.getActiveSummaries([
        { contentType: moderationEvent.contentType, contentId: moderationEvent.contentId },
      ]),
    ])

    const reportSignals = reportSignalsMap.get(
      `${moderationEvent.contentType}:${moderationEvent.contentId}`
    )
    if (reportSignals) {
      if (reportSignals.priority === 'critical') severity = maxSeverity(severity, 'critical')
      if (reportSignals.priority === 'high') severity = maxSeverity(severity, 'high')
      if (reportSignals.priority === 'medium') severity = maxSeverity(severity, 'medium')
    }

    const automatedSignals = automatedSignalsMap.get(
      `${moderationEvent.contentType}:${moderationEvent.contentId}`
    )
    if (automatedSignals) {
      if (automatedSignals.severity === 'critical') severity = maxSeverity(severity, 'critical')
      if (automatedSignals.severity === 'high') severity = maxSeverity(severity, 'high')
      if (automatedSignals.severity === 'medium') severity = maxSeverity(severity, 'medium')
    }

    const metadata = moderationEvent.metadata
    if (metadata && typeof metadata === 'object') {
      const metadataRecord = metadata as Record<string, unknown>
      if (metadataRecord.policyAutoHide === true || metadataRecord.automatedDetection === true) {
        severity = maxSeverity(severity, 'high')
      }
      if (metadataRecord.fastTrack === true) {
        severity = maxSeverity(severity, 'high')
      }
      if (
        metadataRecord.bulkModeration === true &&
        moderationEvent.action === 'hide'
      ) {
        severity = maxSeverity(severity, 'high')
      }
    }

    return severity
  }

  private mapAppeal(
    appeal: {
      _id?: unknown
      moderationEvent?: unknown
      contentType?: unknown
      contentId?: unknown
      appellant?: unknown
      status?: unknown
      severity?: unknown
      reasonCategory?: unknown
      reason?: unknown
      note?: unknown
      slaHours?: unknown
      openedAt?: unknown
      firstResponseAt?: unknown
      resolvedAt?: unknown
      dueAt?: unknown
      createdBy?: unknown
      updatedBy?: unknown
      version?: unknown
      history?: unknown
      createdAt?: unknown
      updatedAt?: unknown
    },
    includeHistory = false
  ) {
    const status = isValidModerationAppealStatus(appeal.status) ? appeal.status : 'open'
    const openedAt = toDateOrNull(appeal.openedAt)
    const dueAt = toDateOrNull(appeal.dueAt)
    const firstResponseAt = toDateOrNull(appeal.firstResponseAt)
    const resolvedAt = toDateOrNull(appeal.resolvedAt)
    const nowMs = Date.now()

    const isSlaBreachable = status === 'open' || status === 'under_review'
    const isSlaBreached =
      isSlaBreachable && dueAt instanceof Date ? dueAt.getTime() < nowMs : false
    const remainingMinutes =
      isSlaBreachable && dueAt instanceof Date
        ? Math.floor((dueAt.getTime() - nowMs) / (60 * 1000))
        : null

    const firstResponseMinutes =
      openedAt && firstResponseAt
        ? Math.max(0, Math.round((firstResponseAt.getTime() - openedAt.getTime()) / (60 * 1000)))
        : null

    const resolutionMinutes =
      openedAt && resolvedAt
        ? Math.max(0, Math.round((resolvedAt.getTime() - openedAt.getTime()) / (60 * 1000)))
        : null

    const historyRows = Array.isArray(appeal.history) ? appeal.history : []

    return {
      id:
        appeal._id instanceof mongoose.Types.ObjectId
          ? String(appeal._id)
          : typeof appeal._id === 'string'
            ? appeal._id
            : null,
      moderationEvent:
        appeal.moderationEvent && typeof appeal.moderationEvent === 'object'
          ? {
              id: resolveAnyId(appeal.moderationEvent),
              contentType:
                typeof (appeal.moderationEvent as { contentType?: unknown }).contentType === 'string'
                  ? (appeal.moderationEvent as { contentType: string }).contentType
                  : null,
              contentId:
                typeof (appeal.moderationEvent as { contentId?: unknown }).contentId === 'string'
                  ? (appeal.moderationEvent as { contentId: string }).contentId
                  : null,
              action:
                typeof (appeal.moderationEvent as { action?: unknown }).action === 'string'
                  ? (appeal.moderationEvent as { action: string }).action
                  : null,
              fromStatus:
                typeof (appeal.moderationEvent as { fromStatus?: unknown }).fromStatus === 'string'
                  ? (appeal.moderationEvent as { fromStatus: string }).fromStatus
                  : null,
              toStatus:
                typeof (appeal.moderationEvent as { toStatus?: unknown }).toStatus === 'string'
                  ? (appeal.moderationEvent as { toStatus: string }).toStatus
                  : null,
              reason:
                typeof (appeal.moderationEvent as { reason?: unknown }).reason === 'string'
                  ? (appeal.moderationEvent as { reason: string }).reason
                  : null,
              createdAt: toDateOrNull((appeal.moderationEvent as { createdAt?: unknown }).createdAt)?.toISOString() ?? null,
            }
          : null,
      contentType:
        typeof appeal.contentType === 'string' ? (appeal.contentType as ModeratableContentType) : null,
      contentId: typeof appeal.contentId === 'string' ? appeal.contentId : null,
      appellant: mapActor(appeal.appellant),
      status,
      severity: isValidModerationAppealSeverity(appeal.severity) ? appeal.severity : 'medium',
      reasonCategory: isValidModerationAppealReasonCategory(appeal.reasonCategory)
        ? appeal.reasonCategory
        : 'other',
      reason: typeof appeal.reason === 'string' ? appeal.reason : '',
      note: typeof appeal.note === 'string' ? appeal.note : null,
      slaHours: typeof appeal.slaHours === 'number' ? appeal.slaHours : DEFAULT_SLA_HOURS,
      openedAt: openedAt ? openedAt.toISOString() : null,
      firstResponseAt: firstResponseAt ? firstResponseAt.toISOString() : null,
      resolvedAt: resolvedAt ? resolvedAt.toISOString() : null,
      dueAt: dueAt ? dueAt.toISOString() : null,
      sla: {
        isBreached: isSlaBreached,
        remainingMinutes,
        firstResponseMinutes,
        resolutionMinutes,
      },
      createdBy: mapActor(appeal.createdBy),
      updatedBy: mapActor(appeal.updatedBy),
      version: typeof appeal.version === 'number' ? appeal.version : 1,
      historyCount: historyRows.length,
      lastHistoryEntry:
        historyRows.length > 0 && typeof historyRows[historyRows.length - 1] === 'object'
          ? historyRows[historyRows.length - 1]
          : null,
      history: includeHistory
        ? historyRows
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
            .map((item) => ({
              fromStatus:
                typeof item.fromStatus === 'string' ? item.fromStatus : 'open',
              toStatus: typeof item.toStatus === 'string' ? item.toStatus : 'open',
              reason: typeof item.reason === 'string' ? item.reason : '',
              note: typeof item.note === 'string' ? item.note : null,
              changedAt: toDateOrNull(item.changedAt)?.toISOString() ?? null,
              changedBy: mapActor(item.changedBy),
            }))
        : undefined,
      createdAt: toDateOrNull(appeal.createdAt)?.toISOString() ?? null,
      updatedAt: toDateOrNull(appeal.updatedAt)?.toISOString() ?? null,
    }
  }
}

export const moderationAppealService = new ModerationAppealService()
