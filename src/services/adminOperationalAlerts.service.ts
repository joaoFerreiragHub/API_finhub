import mongoose from 'mongoose'
import { AdminAuditLog } from '../models/AdminAuditLog'
import { ContentReport, ContentReportReason } from '../models/ContentReport'
import { UserModerationEvent } from '../models/UserModerationEvent'
import { CreatorOperationalAction, User, UserRole } from '../models/User'
import { buildReportSignalSummary, isPriorityAtLeast } from './contentReport.service'

export type AdminOperationalAlertType =
  | 'ban_applied'
  | 'content_hide_spike'
  | 'delegated_access_started'
  | 'critical_report_target'
  | 'policy_auto_hide_triggered'
  | 'policy_auto_hide_failed'
  | 'creator_control_applied'
export type AdminOperationalAlertSeverity = 'critical' | 'high' | 'medium'

interface AdminAlertActorSummary {
  id: string
  name?: string
  username?: string
  email?: string
  role?: UserRole
}

export interface AdminOperationalAlert {
  id: string
  type: AdminOperationalAlertType
  severity: AdminOperationalAlertSeverity
  title: string
  description: string
  action: string
  resourceType: string
  resourceId?: string
  detectedAt: string
  actor: AdminAlertActorSummary | null
  metadata?: Record<string, unknown>
}

export interface ListAdminOperationalAlertsOptions {
  windowHours?: number
  limit?: number
}

export interface AdminOperationalAlertsResponse {
  generatedAt: string
  windowHours: number
  thresholds: {
    hideSpikeCount: number
    hideSpikeWindowMinutes: number
    reportPriorityMin: 'high'
    reportMinOpenReports: number
    creatorControlRestrictiveActions: CreatorOperationalAction[]
  }
  summary: {
    critical: number
    high: number
    medium: number
    total: number
  }
  items: AdminOperationalAlert[]
}

interface PopulatedActorLike {
  _id?: unknown
  id?: unknown
  name?: unknown
  username?: unknown
  email?: unknown
  role?: unknown
}

interface AuditLogLike {
  _id: unknown
  actor?: unknown
  action?: unknown
  resourceType?: unknown
  resourceId?: unknown
  outcome?: unknown
  createdAt?: unknown
  metadata?: unknown
}

interface HideSpikeAggregateRow {
  _id: mongoose.Types.ObjectId | null
  total: number
  lastAt: Date
  distinctTargets: string[]
}

interface OpenReportAggregateRow {
  _id: {
    contentType: string
    contentId: string
  }
  openReports: number
  uniqueReporterIds: mongoose.Types.ObjectId[]
  latestReportAt: Date | null
  reasons: ContentReportReason[]
}

interface UserModerationEventLike {
  _id: unknown
  actor?: unknown
  user?: unknown
  reason?: unknown
  note?: unknown
  metadata?: unknown
  createdAt?: unknown
}

const DEFAULT_WINDOW_HOURS = 24
const MAX_WINDOW_HOURS = 24 * 7
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

const HIDE_SPIKE_THRESHOLD = 5
const HIDE_SPIKE_WINDOW_MINUTES = 30
const REPORT_ALERT_MIN_OPEN_REPORTS = 3
const RESTRICTIVE_CREATOR_CONTROL_ACTIONS: CreatorOperationalAction[] = [
  'set_cooldown',
  'block_creation',
  'block_publishing',
  'suspend_creator_ops',
]

const toPositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const parsed = Math.floor(value)
  return parsed > 0 ? parsed : fallback
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

const toStringSafe = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const resolveAnyId = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string' && value.length > 0) return value
  if (value instanceof mongoose.Types.ObjectId) return String(value)
  if (typeof value === 'object') {
    const record = value as { id?: unknown; _id?: unknown }
    const id = toStringSafe(record.id)
    if (id) return id
    const objectId = record._id
    if (typeof objectId === 'string' && objectId.length > 0) return objectId
    if (objectId instanceof mongoose.Types.ObjectId) return String(objectId)
  }
  return null
}

const toRole = (value: unknown): UserRole | undefined => {
  if (
    value === 'visitor' ||
    value === 'free' ||
    value === 'premium' ||
    value === 'creator' ||
    value === 'admin'
  ) {
    return value
  }
  return undefined
}

const mapActor = (input: unknown): AdminAlertActorSummary | null => {
  if (!input || typeof input !== 'object') return null
  const actorLike = input as PopulatedActorLike
  const id = resolveAnyId(actorLike)
  if (!id) return null

  return {
    id,
    name: toStringSafe(actorLike.name) ?? undefined,
    username: toStringSafe(actorLike.username) ?? undefined,
    email: toStringSafe(actorLike.email) ?? undefined,
    role: toRole(actorLike.role),
  }
}

const getSeveritySummary = (items: AdminOperationalAlert[]) => {
  let critical = 0
  let high = 0
  let medium = 0

  for (const item of items) {
    if (item.severity === 'critical') critical += 1
    if (item.severity === 'high') high += 1
    if (item.severity === 'medium') medium += 1
  }

  return {
    critical,
    high,
    medium,
    total: items.length,
  }
}

const toMetadataRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined

const mapPolicyAutoHideSeverity = (
  outcome: unknown,
  metadata: Record<string, unknown> | undefined
): AdminOperationalAlertSeverity => {
  if (outcome === 'error') return 'critical'

  const policySignals =
    metadata?.policySignals && typeof metadata.policySignals === 'object'
      ? (metadata.policySignals as Record<string, unknown>)
      : undefined

  return policySignals?.escalation === 'critical' ? 'critical' : 'high'
}

const mapCreatorControlSeverity = (
  action: CreatorOperationalAction | null
): AdminOperationalAlertSeverity => {
  if (action === 'suspend_creator_ops') return 'critical'
  if (action === 'block_creation' || action === 'block_publishing') return 'high'
  return 'medium'
}

const mapCreatorControlTitle = (action: CreatorOperationalAction | null): string => {
  if (action === 'suspend_creator_ops') return 'Operacao de creator suspensa'
  if (action === 'block_creation') return 'Criacao de conteudo bloqueada'
  if (action === 'block_publishing') return 'Publicacao de conteudo bloqueada'
  return 'Cooldown operacional aplicado'
}

export class AdminOperationalAlertsService {
  async listInternalAlerts(
    options: ListAdminOperationalAlertsOptions = {}
  ): Promise<AdminOperationalAlertsResponse> {
    const now = new Date()
    const windowHours = clamp(
      toPositiveInt(options.windowHours, DEFAULT_WINDOW_HOURS),
      1,
      MAX_WINDOW_HOURS
    )
    const limit = clamp(toPositiveInt(options.limit, DEFAULT_LIMIT), 1, MAX_LIMIT)
    const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000)

    const [
      banAlerts,
      delegatedAlerts,
      hideSpikeAlerts,
      reportRiskAlerts,
      policyAutoHideAlerts,
      creatorControlAlerts,
    ] = await Promise.all([
      this.listBanAlerts(windowStart, limit),
      this.listDelegatedAccessAlerts(windowStart, limit),
      this.listHideSpikeAlerts(limit),
      this.listCriticalReportAlerts(windowStart, limit),
      this.listPolicyAutoHideAlerts(windowStart, limit),
      this.listCreatorControlAlerts(windowStart, limit),
    ])

    const items = [
      ...banAlerts,
      ...delegatedAlerts,
      ...hideSpikeAlerts,
      ...reportRiskAlerts,
      ...policyAutoHideAlerts,
      ...creatorControlAlerts,
    ]
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .slice(0, limit)

    return {
      generatedAt: now.toISOString(),
      windowHours,
      thresholds: {
        hideSpikeCount: HIDE_SPIKE_THRESHOLD,
        hideSpikeWindowMinutes: HIDE_SPIKE_WINDOW_MINUTES,
        reportPriorityMin: 'high',
        reportMinOpenReports: REPORT_ALERT_MIN_OPEN_REPORTS,
        creatorControlRestrictiveActions: RESTRICTIVE_CREATOR_CONTROL_ACTIONS,
      },
      summary: getSeveritySummary(items),
      items,
    }
  }

  private async listBanAlerts(windowStart: Date, limit: number): Promise<AdminOperationalAlert[]> {
    const rows = (await AdminAuditLog.find({
      action: 'admin.users.ban',
      outcome: 'success',
      createdAt: { $gte: windowStart },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name username email role')
      .lean()) as AuditLogLike[]

    const alerts: AdminOperationalAlert[] = []
    for (const row of rows) {
      const id = resolveAnyId(row._id)
      const detectedAt = toDate(row.createdAt)
      if (!id || !detectedAt) continue

      const actor = mapActor(row.actor)
      const resourceId = toStringSafe(row.resourceId) ?? undefined

      alerts.push({
        id: `ban:${id}`,
        type: 'ban_applied',
        severity: 'critical',
        title: 'Banimento aplicado',
        description: `Conta alvo ${resourceId ?? '(id em falta)'} foi banida por acao administrativa.`,
        action: 'admin.users.ban',
        resourceType: 'user',
        resourceId,
        detectedAt: detectedAt.toISOString(),
        actor,
        metadata:
          row.metadata && typeof row.metadata === 'object'
            ? (row.metadata as Record<string, unknown>)
            : undefined,
      })
    }

    return alerts
  }

  private async listDelegatedAccessAlerts(
    windowStart: Date,
    limit: number
  ): Promise<AdminOperationalAlert[]> {
    const rows = (await AdminAuditLog.find({
      action: 'admin.support.sessions.start',
      outcome: 'success',
      createdAt: { $gte: windowStart },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name username email role')
      .lean()) as AuditLogLike[]

    const alerts: AdminOperationalAlert[] = []
    for (const row of rows) {
      const id = resolveAnyId(row._id)
      const detectedAt = toDate(row.createdAt)
      if (!id || !detectedAt) continue

      const actor = mapActor(row.actor)
      const resourceId = toStringSafe(row.resourceId) ?? undefined

      alerts.push({
        id: `delegated:${id}`,
        type: 'delegated_access_started',
        severity: 'high',
        title: 'Sessao delegada iniciada',
        description: `Sessao assistida ${resourceId ?? '(id em falta)'} entrou em modo ativo.`,
        action: 'admin.support.sessions.start',
        resourceType: 'assisted_session',
        resourceId,
        detectedAt: detectedAt.toISOString(),
        actor,
        metadata:
          row.metadata && typeof row.metadata === 'object'
            ? (row.metadata as Record<string, unknown>)
            : undefined,
      })
    }

    return alerts
  }

  private async listHideSpikeAlerts(limit: number): Promise<AdminOperationalAlert[]> {
    const hideWindowStart = new Date(Date.now() - HIDE_SPIKE_WINDOW_MINUTES * 60 * 1000)

    const grouped = await AdminAuditLog.aggregate<HideSpikeAggregateRow>([
      {
        $match: {
          action: 'admin.content.hide',
          outcome: 'success',
          createdAt: { $gte: hideWindowStart },
        },
      },
      {
        $group: {
          _id: '$actor',
          total: { $sum: 1 },
          lastAt: { $max: '$createdAt' },
          distinctTargets: { $addToSet: '$resourceId' },
        },
      },
      {
        $match: {
          total: { $gte: HIDE_SPIKE_THRESHOLD },
        },
      },
      {
        $sort: {
          lastAt: -1,
        },
      },
      {
        $limit: limit,
      },
    ])

    if (grouped.length === 0) return []

    const actorIds = grouped
      .map((item) => item._id)
      .filter((value): value is mongoose.Types.ObjectId => value instanceof mongoose.Types.ObjectId)

    const actors = (await User.find({ _id: { $in: actorIds } })
      .select('_id name username email role')
      .lean()) as unknown as Array<{
      _id: mongoose.Types.ObjectId
      name?: string
      username?: string
      email?: string
      role?: UserRole
    }>

    const actorById = new Map<string, AdminAlertActorSummary>()
    for (const actor of actors) {
      actorById.set(String(actor._id), {
        id: String(actor._id),
        name: actor.name,
        username: actor.username,
        email: actor.email,
        role: actor.role,
      })
    }

    const alerts: AdminOperationalAlert[] = []
    for (const item of grouped) {
      const actorId = item._id ? String(item._id) : null
      const detectedAt = toDate(item.lastAt)
      if (!actorId || !detectedAt) continue

      const severity: AdminOperationalAlertSeverity =
        item.total >= HIDE_SPIKE_THRESHOLD * 2 ? 'critical' : 'high'
      const distinctTargetCount = item.distinctTargets.filter(
        (target): target is string => typeof target === 'string' && target.trim().length > 0
      ).length

      alerts.push({
        id: `hide-spike:${actorId}:${detectedAt.toISOString()}`,
        type: 'content_hide_spike',
        severity,
        title: 'Spike de ocultacao de conteudo',
        description: `${item.total} ocultacoes executadas nos ultimos ${HIDE_SPIKE_WINDOW_MINUTES} minutos.`,
        action: 'admin.content.hide',
        resourceType: 'content',
        detectedAt: detectedAt.toISOString(),
        actor: actorById.get(actorId) ?? { id: actorId },
        metadata: {
          hideCount: item.total,
          distinctTargetCount,
          windowMinutes: HIDE_SPIKE_WINDOW_MINUTES,
          threshold: HIDE_SPIKE_THRESHOLD,
        },
      })
    }

    return alerts
  }

  private async listCriticalReportAlerts(
    windowStart: Date,
    limit: number
  ): Promise<AdminOperationalAlert[]> {
    const grouped = await ContentReport.aggregate<OpenReportAggregateRow>([
      { $match: { status: 'open' } },
      {
        $group: {
          _id: {
            contentType: '$contentType',
            contentId: '$contentId',
          },
          openReports: { $sum: 1 },
          uniqueReporterIds: { $addToSet: '$reporter' },
          latestReportAt: { $max: '$createdAt' },
          reasons: { $push: '$reason' },
        },
      },
      {
        $match: {
          openReports: { $gte: REPORT_ALERT_MIN_OPEN_REPORTS },
          latestReportAt: { $gte: windowStart },
        },
      },
    ])

    const alerts: AdminOperationalAlert[] = []
    for (const row of grouped) {
      const summary = buildReportSignalSummary({
        openReports: row.openReports,
        uniqueReporters: row.uniqueReporterIds.length,
        latestReportAt: row.latestReportAt,
        reasons: row.reasons,
      })

      if (!isPriorityAtLeast(summary.priority, 'high') || !summary.latestReportAt) {
        continue
      }

      const severity: AdminOperationalAlertSeverity =
        summary.priority === 'critical' ? 'critical' : 'high'
      const resourceId = `${row._id.contentType}:${row._id.contentId}`

      alerts.push({
        id: `report-target:${resourceId}`,
        type: 'critical_report_target',
        severity,
        title: 'Alvo com pressao de reports',
        description: `${summary.openReports} reports abertos de ${summary.uniqueReporters} reporters unicos para ${resourceId}.`,
        action: 'admin.content.queue.review',
        resourceType: 'content',
        resourceId,
        detectedAt: summary.latestReportAt.toISOString(),
        actor: null,
        metadata: {
          contentType: row._id.contentType,
          contentId: row._id.contentId,
          priority: summary.priority,
          priorityScore: summary.priorityScore,
          openReports: summary.openReports,
          uniqueReporters: summary.uniqueReporters,
          latestReportAt: summary.latestReportAt.toISOString(),
          topReasons: summary.topReasons.map((item) => item.reason),
        },
      })
    }

    alerts.sort((a, b) => {
      const scoreA =
        typeof a.metadata?.priorityScore === 'number' ? (a.metadata.priorityScore as number) : 0
      const scoreB =
        typeof b.metadata?.priorityScore === 'number' ? (b.metadata.priorityScore as number) : 0

      return scoreB - scoreA || new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    })

    return alerts.slice(0, limit)
  }

  private async listPolicyAutoHideAlerts(
    windowStart: Date,
    limit: number
  ): Promise<AdminOperationalAlert[]> {
    const rows = (await AdminAuditLog.find({
      action: 'admin.content.policy_auto_hide',
      outcome: { $in: ['success', 'error'] },
      createdAt: { $gte: windowStart },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name username email role')
      .lean()) as AuditLogLike[]

    const alerts: AdminOperationalAlert[] = []
    for (const row of rows) {
      const id = resolveAnyId(row._id)
      const detectedAt = toDate(row.createdAt)
      if (!id || !detectedAt) continue

      const metadata = toMetadataRecord(row.metadata)
      const severity = mapPolicyAutoHideSeverity(row.outcome, metadata)
      const resourceId = toStringSafe(row.resourceId) ?? undefined
      const failed = row.outcome === 'error'

      alerts.push({
        id: `policy-auto-hide:${id}`,
        type: failed ? 'policy_auto_hide_failed' : 'policy_auto_hide_triggered',
        severity,
        title: failed ? 'Auto-hide preventivo falhou' : 'Auto-hide preventivo acionado',
        description: failed
          ? `Falha ao ocultar preventivamente ${resourceId ?? 'conteudo sem id resolvido'}.`
          : `Ocultacao preventiva automatica aplicada a ${resourceId ?? 'conteudo sem id resolvido'}.`,
        action: 'admin.content.policy_auto_hide',
        resourceType: 'content',
        resourceId,
        detectedAt: detectedAt.toISOString(),
        actor: mapActor(row.actor),
        metadata,
      })
    }

    return alerts
  }

  private async listCreatorControlAlerts(
    windowStart: Date,
    limit: number
  ): Promise<AdminOperationalAlert[]> {
    const rows = (await UserModerationEvent.find({
      action: 'creator_control',
      createdAt: { $gte: windowStart },
      'metadata.creatorControlAction': { $in: RESTRICTIVE_CREATOR_CONTROL_ACTIONS },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name username email role')
      .populate('user', 'name username email role')
      .lean()) as UserModerationEventLike[]

    const alerts: AdminOperationalAlert[] = []
    for (const row of rows) {
      const id = resolveAnyId(row._id)
      const detectedAt = toDate(row.createdAt)
      if (!id || !detectedAt) continue

      const metadata = toMetadataRecord(row.metadata)
      const creatorControlAction =
        metadata?.creatorControlAction && typeof metadata.creatorControlAction === 'string'
          ? (metadata.creatorControlAction as CreatorOperationalAction)
          : null
      const targetUser = mapActor(row.user)

      alerts.push({
        id: `creator-control:${id}`,
        type: 'creator_control_applied',
        severity: mapCreatorControlSeverity(creatorControlAction),
        title: mapCreatorControlTitle(creatorControlAction),
        description: `Creator ${targetUser?.username ?? targetUser?.email ?? targetUser?.id ?? '(id em falta)'} recebeu acao ${creatorControlAction ?? 'desconhecida'}.`,
        action: 'admin.users.creator_controls.apply',
        resourceType: 'user',
        resourceId: targetUser?.id,
        detectedAt: detectedAt.toISOString(),
        actor: mapActor(row.actor),
        metadata: {
          ...(metadata ?? {}),
          reason: toStringSafe(row.reason) ?? undefined,
          note: toStringSafe(row.note) ?? undefined,
          targetUser,
        },
      })
    }

    return alerts
  }
}

export const adminOperationalAlertsService = new AdminOperationalAlertsService()
