import mongoose from 'mongoose'
import { AdminAuditLog } from '../models/AdminAuditLog'
import { AdminContentJob } from '../models/AdminContentJob'
import {
  AdminOperationalAlertState,
  AdminOperationalAlertStateValue,
} from '../models/AdminOperationalAlertState'
import {
  AutomatedModerationRule,
  AutomatedModerationSeverity,
  AutomatedModerationSignal,
} from '../models/AutomatedModerationSignal'
import { ContentFalsePositiveFeedback } from '../models/ContentFalsePositiveFeedback'
import { ContentReport, ContentReportReason } from '../models/ContentReport'
import { UserModerationEvent } from '../models/UserModerationEvent'
import { CreatorOperationalAction, User, UserRole } from '../models/User'
import { buildReportSignalSummary, isPriorityAtLeast } from './contentReport.service'
import { platformIntegrationConfigService } from './platformIntegrationConfig.service'

export type AdminOperationalAlertType =
  | 'ban_applied'
  | 'surface_disabled'
  | 'content_hide_spike'
  | 'delegated_access_started'
  | 'critical_report_target'
  | 'policy_auto_hide_triggered'
  | 'policy_auto_hide_failed'
  | 'automated_detection_high_risk'
  | 'automated_detection_auto_hide_triggered'
  | 'automated_detection_auto_hide_failed'
  | 'creator_control_applied'
  | 'content_jobs_stale_backlog'
  | 'content_jobs_retry_spike'
  | 'false_positive_spike'
  | 'platform_integration_health_degraded'
export type AdminOperationalAlertSeverity = 'critical' | 'high' | 'medium'
export type AdminOperationalAlertStateStatus = 'open' | 'acknowledged' | 'dismissed'

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
  state?: AdminOperationalAlertStateStatus
  title: string
  description: string
  action: string
  resourceType: string
  resourceId?: string
  detectedAt: string
  actor: AdminAlertActorSummary | null
  stateChangedAt?: string
  stateReason?: string
  stateChangedBy?: AdminAlertActorSummary | null
  metadata?: Record<string, unknown>
}

export interface ListAdminOperationalAlertsOptions {
  windowHours?: number
  limit?: number
  state?: AdminOperationalAlertStateStatus | 'all'
  includeDismissed?: boolean
}

export interface AdminOperationalAlertsResponse {
  generatedAt: string
  windowHours: number
  thresholds: {
    hideSpikeCount: number
    hideSpikeWindowMinutes: number
    reportPriorityMin: 'high'
    reportMinOpenReports: number
    automatedDetectionSeverityMin: 'high'
    creatorControlRestrictiveActions: CreatorOperationalAction[]
    staleJobsMinCount: number
    staleRunningMinutes: number
    staleQueuedMinutes: number
    retrySpikeMinJobs: number
    falsePositiveSpikeMinEvents: number
    integrationHealthDegradedStatuses: Array<'warning' | 'error'>
  }
  summary: {
    critical: number
    high: number
    medium: number
    total: number
  }
  stateSummary: {
    open: number
    acknowledged: number
    dismissed: number
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
  rawEvents: number
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

interface AutomatedDetectionAlertRow {
  _id: unknown
  contentType: string
  contentId: string
  severity: AutomatedModerationSeverity
  score: number
  triggeredRules: Array<{
    rule?: AutomatedModerationRule
  }>
  lastDetectedAt?: Date | null
  automation?: {
    attempted?: boolean
    executed?: boolean
    action?: string | null
    lastOutcome?: 'success' | 'error' | null
  } | null
}

interface AlertStateRowLike {
  alertId: string
  state: AdminOperationalAlertStateValue
  reason?: unknown
  changedAt?: unknown
  changedBy?: unknown
}

const DEFAULT_WINDOW_HOURS = 24
const MAX_WINDOW_HOURS = 24 * 7
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

const parseEnvPositiveInt = (value: string | undefined, fallback: number): number => {
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const HIDE_SPIKE_THRESHOLD = parseEnvPositiveInt(process.env.ADMIN_ALERT_HIDE_SPIKE_THRESHOLD, 5)
const HIDE_SPIKE_WINDOW_MINUTES = parseEnvPositiveInt(
  process.env.ADMIN_ALERT_HIDE_SPIKE_WINDOW_MINUTES,
  30
)
const REPORT_ALERT_MIN_OPEN_REPORTS = 3
const AUTOMATED_DETECTION_ALERT_MIN_SEVERITY: AutomatedModerationSeverity = 'high'
const RESTRICTIVE_CREATOR_CONTROL_ACTIONS: CreatorOperationalAction[] = [
  'set_cooldown',
  'block_creation',
  'block_publishing',
  'suspend_creator_ops',
]
const JOB_STALE_ALERT_MIN_COUNT = parseEnvPositiveInt(
  process.env.ADMIN_ALERT_JOB_STALE_MIN_COUNT,
  3
)
const JOB_STALE_RUNNING_MINUTES = parseEnvPositiveInt(
  process.env.ADMIN_ALERT_JOB_STALE_RUNNING_MINUTES,
  15
)
const JOB_STALE_QUEUED_MINUTES = parseEnvPositiveInt(
  process.env.ADMIN_ALERT_JOB_STALE_QUEUED_MINUTES,
  60
)
const JOB_RETRY_SPIKE_MIN_JOBS = parseEnvPositiveInt(
  process.env.ADMIN_ALERT_JOB_RETRY_SPIKE_MIN_JOBS,
  5
)
const FALSE_POSITIVE_SPIKE_MIN_EVENTS = parseEnvPositiveInt(
  process.env.ADMIN_ALERT_FALSE_POSITIVE_SPIKE_MIN_EVENTS,
  8
)
const INTEGRATION_HEALTH_DEGRADED_STATUSES: Array<'warning' | 'error'> = ['warning', 'error']

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
    value === 'brand_manager' ||
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

const getStateSummary = (items: AdminOperationalAlert[]) => {
  let open = 0
  let acknowledged = 0
  let dismissed = 0

  for (const item of items) {
    const state = item.state ?? 'open'
    if (state === 'open') open += 1
    if (state === 'acknowledged') acknowledged += 1
    if (state === 'dismissed') dismissed += 1
  }

  return {
    open,
    acknowledged,
    dismissed,
    total: items.length,
  }
}

const toAlertStateFilter = (value: unknown): AdminOperationalAlertStateStatus | 'all' => {
  if (value === 'open' || value === 'acknowledged' || value === 'dismissed') {
    return value
  }
  return 'all'
}

const toMetadataRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined

const toAutomatedDetectionSeverityRank = (value: AutomatedModerationSeverity): number => {
  if (value === 'critical') return 4
  if (value === 'high') return 3
  if (value === 'medium') return 2
  if (value === 'low') return 1
  return 0
}

const isAutomatedDetectionSeverityAtLeast = (
  current: AutomatedModerationSeverity,
  minimum: AutomatedModerationSeverity
): boolean => toAutomatedDetectionSeverityRank(current) >= toAutomatedDetectionSeverityRank(minimum)

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

const buildExecutableJobQuery = () => ({
  $or: [
    { type: 'bulk_moderate' },
    { type: 'bulk_rollback', 'approval.required': { $ne: true } },
    { type: 'bulk_rollback', 'approval.reviewStatus': 'approved' },
  ],
})

export class AdminOperationalAlertsService {
  private async loadStateByAlertId(alertIds: string[]): Promise<Map<string, AlertStateRowLike>> {
    const uniqueIds = Array.from(
      new Set(alertIds.filter((item) => typeof item === 'string' && item.trim().length > 0))
    )
    if (uniqueIds.length === 0) return new Map<string, AlertStateRowLike>()

    const rows = (await AdminOperationalAlertState.find({
      alertId: { $in: uniqueIds },
    })
      .populate('changedBy', 'name username email role')
      .lean()) as unknown as AlertStateRowLike[]

    const byAlertId = new Map<string, AlertStateRowLike>()
    for (const row of rows) {
      if (typeof row.alertId === 'string' && row.alertId.length > 0) {
        byAlertId.set(row.alertId, row)
      }
    }

    return byAlertId
  }

  private applyState(
    item: AdminOperationalAlert,
    stateRow: AlertStateRowLike | undefined
  ): AdminOperationalAlert {
    if (!stateRow) return { ...item, state: 'open' }

    return {
      ...item,
      state: stateRow.state,
      stateChangedAt: toDate(stateRow.changedAt)?.toISOString(),
      stateReason: toStringSafe(stateRow.reason) ?? undefined,
      stateChangedBy: mapActor(stateRow.changedBy),
    }
  }

  async setAlertState(input: {
    alertId: string
    state: AdminOperationalAlertStateValue
    actorId: string
    reason?: string
  }): Promise<{
    alertId: string
    state: AdminOperationalAlertStateStatus
    changedAt: string
    reason?: string
    changedBy: AdminAlertActorSummary | null
  }> {
    const alertId = typeof input.alertId === 'string' ? input.alertId.trim() : ''
    if (!alertId) {
      throw new Error('alertId obrigatorio.')
    }
    if (alertId.length > 256) {
      throw new Error('alertId excede o limite maximo de 256 caracteres.')
    }
    if (!mongoose.Types.ObjectId.isValid(input.actorId)) {
      throw new Error('actorId invalido.')
    }

    const changedAt = new Date()
    const reason = typeof input.reason === 'string' && input.reason.trim().length > 0
      ? input.reason.trim()
      : undefined

    const updated = await AdminOperationalAlertState.findOneAndUpdate(
      { alertId },
      {
        $set: {
          state: input.state,
          changedBy: new mongoose.Types.ObjectId(input.actorId),
          changedAt,
          reason: reason ?? null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate('changedBy', 'name username email role')
      .lean()

    const changedBy = updated ? mapActor((updated as any).changedBy) : null
    const state = updated?.state === 'dismissed' ? 'dismissed' : updated?.state === 'acknowledged' ? 'acknowledged' : 'open'

    return {
      alertId,
      state,
      changedAt: toDate(updated?.changedAt)?.toISOString() ?? changedAt.toISOString(),
      reason,
      changedBy,
    }
  }

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
    const stateFilter = toAlertStateFilter(options.state)
    const includeDismissed = options.includeDismissed === true
    const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000)

    const [
      banAlerts,
      surfaceDisabledAlerts,
      delegatedAlerts,
      hideSpikeAlerts,
      reportRiskAlerts,
      policyAutoHideAlerts,
      automatedDetectionAlerts,
      automatedDetectionAutoHideAlerts,
      creatorControlAlerts,
      staleJobAlerts,
      retrySpikeAlerts,
      falsePositiveAlerts,
      integrationHealthAlerts,
    ] = await Promise.all([
      this.listBanAlerts(windowStart, limit),
      this.listSurfaceDisabledAlerts(windowStart, limit),
      this.listDelegatedAccessAlerts(windowStart, limit),
      this.listHideSpikeAlerts(limit),
      this.listCriticalReportAlerts(windowStart, limit),
      this.listPolicyAutoHideAlerts(windowStart, limit),
      this.listAutomatedDetectionAlerts(windowStart, limit),
      this.listAutomatedDetectionAutoHideAlerts(windowStart, limit),
      this.listCreatorControlAlerts(windowStart, limit),
      this.listStaleJobAlerts(now),
      this.listRetrySpikeAlerts(windowStart),
      this.listFalsePositiveSpikeAlerts(windowStart),
      this.listPlatformIntegrationHealthAlerts(limit),
    ])

    const baseItems = [
      ...banAlerts,
      ...surfaceDisabledAlerts,
      ...delegatedAlerts,
      ...hideSpikeAlerts,
      ...reportRiskAlerts,
      ...policyAutoHideAlerts,
      ...automatedDetectionAlerts,
      ...automatedDetectionAutoHideAlerts,
      ...creatorControlAlerts,
      ...staleJobAlerts,
      ...retrySpikeAlerts,
      ...falsePositiveAlerts,
      ...integrationHealthAlerts,
    ]
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .slice(0, limit)

    const stateByAlertId = await this.loadStateByAlertId(baseItems.map((item) => item.id))
    const enrichedItems = baseItems.map((item) => this.applyState(item, stateByAlertId.get(item.id)))

    const items = enrichedItems.filter((item) => {
      const state = item.state ?? 'open'
      if (stateFilter !== 'all') return state === stateFilter
      if (!includeDismissed && state === 'dismissed') return false
      return true
    })

    return {
      generatedAt: now.toISOString(),
      windowHours,
      thresholds: {
        hideSpikeCount: HIDE_SPIKE_THRESHOLD,
        hideSpikeWindowMinutes: HIDE_SPIKE_WINDOW_MINUTES,
        reportPriorityMin: 'high',
        reportMinOpenReports: REPORT_ALERT_MIN_OPEN_REPORTS,
        automatedDetectionSeverityMin: 'high',
        creatorControlRestrictiveActions: RESTRICTIVE_CREATOR_CONTROL_ACTIONS,
        staleJobsMinCount: JOB_STALE_ALERT_MIN_COUNT,
        staleRunningMinutes: JOB_STALE_RUNNING_MINUTES,
        staleQueuedMinutes: JOB_STALE_QUEUED_MINUTES,
        retrySpikeMinJobs: JOB_RETRY_SPIKE_MIN_JOBS,
        falsePositiveSpikeMinEvents: FALSE_POSITIVE_SPIKE_MIN_EVENTS,
        integrationHealthDegradedStatuses: INTEGRATION_HEALTH_DEGRADED_STATUSES,
      },
      summary: getSeveritySummary(items),
      stateSummary: getStateSummary(enrichedItems),
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

  private async listSurfaceDisabledAlerts(
    windowStart: Date,
    limit: number
  ): Promise<AdminOperationalAlert[]> {
    const rows = (await AdminAuditLog.find({
      action: 'admin.platform.surfaces.update',
      outcome: 'success',
      createdAt: { $gte: windowStart },
      'metadata.enabled': false,
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
      const surfaceKey = toStringSafe(row.resourceId) ?? 'surface-desconhecida'
      const publicMessage =
        metadata?.publicMessage && typeof metadata.publicMessage === 'string'
          ? metadata.publicMessage
          : null

      alerts.push({
        id: `surface-disabled:${id}`,
        type: 'surface_disabled',
        severity: 'high',
        title: 'Kill switch de superficie ativado',
        description: `Superficie ${surfaceKey} foi desligada para conter exposicao publica.`,
        action: 'admin.platform.surfaces.update',
        resourceType: 'platform_surface_control',
        resourceId: surfaceKey,
        detectedAt: detectedAt.toISOString(),
        actor: mapActor(row.actor),
        metadata: {
          ...(metadata ?? {}),
          surfaceKey,
          publicMessage,
        },
      })
    }

    return alerts
  }

  private async listHideSpikeAlerts(limit: number): Promise<AdminOperationalAlert[]> {
    const hideWindowStart = new Date(Date.now() - HIDE_SPIKE_WINDOW_MINUTES * 60 * 1000)

    const grouped = await AdminAuditLog.aggregate<HideSpikeAggregateRow>([
      {
        $match: {
          action: {
            $in: ['admin.content.hide', 'admin.content.hide_fast', 'admin.content.bulk_moderate'],
          },
          outcome: 'success',
          createdAt: { $gte: hideWindowStart },
        },
      },
      {
        $addFields: {
          hideWeight: {
            $switch: {
              branches: [
                {
                  case: { $in: ['$action', ['admin.content.hide', 'admin.content.hide_fast']] },
                  then: 1,
                },
                {
                  case: {
                    $and: [
                      { $eq: ['$action', 'admin.content.bulk_moderate'] },
                      { $eq: ['$metadata.bulkAction', 'hide'] },
                    ],
                  },
                  then: {
                    $max: [
                      1,
                      {
                        $convert: {
                          input: '$metadata.bulkItemCount',
                          to: 'int',
                          onError: 1,
                          onNull: 1,
                        },
                      },
                    ],
                  },
                },
              ],
              default: 0,
            },
          },
        },
      },
      {
        $match: {
          hideWeight: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$actor',
          total: { $sum: '$hideWeight' },
          rawEvents: { $sum: 1 },
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
        description: `${item.total} ocultacoes (em ${item.rawEvents} eventos) nos ultimos ${HIDE_SPIKE_WINDOW_MINUTES} minutos.`,
        action: 'admin.content.hide',
        resourceType: 'content',
        detectedAt: detectedAt.toISOString(),
        actor: actorById.get(actorId) ?? { id: actorId },
        metadata: {
          hideCount: item.total,
          rawEvents: item.rawEvents,
          distinctTargetCount,
          windowMinutes: HIDE_SPIKE_WINDOW_MINUTES,
          threshold: HIDE_SPIKE_THRESHOLD,
          includedActions: ['admin.content.hide', 'admin.content.hide_fast', 'admin.content.bulk_moderate'],
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

  private async listAutomatedDetectionAlerts(
    windowStart: Date,
    limit: number
  ): Promise<AdminOperationalAlert[]> {
    const rows = (await AutomatedModerationSignal.find({
      status: 'active',
      lastDetectedAt: { $gte: windowStart },
    })
      .select(
        'contentType contentId severity score triggeredRules lastDetectedAt automation'
      )
      .sort({ lastDetectedAt: -1 })
      .limit(limit)
      .lean()) as AutomatedDetectionAlertRow[]

    const alerts: AdminOperationalAlert[] = []
    for (const row of rows) {
      const detectedAt = toDate(row.lastDetectedAt)
      if (!detectedAt) continue
      if (!isAutomatedDetectionSeverityAtLeast(row.severity, AUTOMATED_DETECTION_ALERT_MIN_SEVERITY)) {
        continue
      }

      const resourceId = `${row.contentType}:${row.contentId}`
      const triggeredRules = Array.isArray(row.triggeredRules)
        ? row.triggeredRules
            .map((item) => item.rule)
            .filter((item): item is AutomatedModerationRule => typeof item === 'string')
        : []

      alerts.push({
        id: `automated-detection:${resourceId}`,
        type: 'automated_detection_high_risk',
        severity: row.severity === 'critical' ? 'critical' : 'high',
        title: 'Detecao automatica de alto risco',
        description: `Sinal ${row.severity} para ${resourceId} com regras ${triggeredRules.join(', ') || 'n/a'}.`,
        action: 'admin.content.queue.review',
        resourceType: 'content',
        resourceId,
        detectedAt: detectedAt.toISOString(),
        actor: null,
        metadata: {
          contentType: row.contentType,
          contentId: row.contentId,
          severity: row.severity,
          score: row.score,
          triggeredRules,
          automation: row.automation ?? null,
        },
      })
    }

    return alerts
  }

  private async listAutomatedDetectionAutoHideAlerts(
    windowStart: Date,
    limit: number
  ): Promise<AdminOperationalAlert[]> {
    const rows = (await AdminAuditLog.find({
      action: 'admin.content.automated_detection_auto_hide',
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
      const resourceId = toStringSafe(row.resourceId) ?? undefined
      const failed = row.outcome === 'error'

      alerts.push({
        id: `automated-detection-auto-hide:${id}`,
        type: failed
          ? 'automated_detection_auto_hide_failed'
          : 'automated_detection_auto_hide_triggered',
        severity: failed ? 'critical' : 'high',
        title: failed
          ? 'Auto-hide por detecao automatica falhou'
          : 'Auto-hide por detecao automatica acionado',
        description: failed
          ? `Falha ao ocultar preventivamente ${resourceId ?? 'conteudo sem id resolvido'}.`
          : `Ocultacao preventiva automatica aplicada a ${resourceId ?? 'conteudo sem id resolvido'}.`,
        action: 'admin.content.automated_detection_auto_hide',
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

  private async listStaleJobAlerts(now: Date): Promise<AdminOperationalAlert[]> {
    const staleRunningBefore = new Date(now.getTime() - JOB_STALE_RUNNING_MINUTES * 60 * 1000)
    const staleQueuedBefore = new Date(now.getTime() - JOB_STALE_QUEUED_MINUTES * 60 * 1000)

    const [staleRunningCount, staleQueuedCount, oldestRunningJob] = await Promise.all([
      AdminContentJob.countDocuments({
        status: 'running',
        $or: [
          { leaseExpiresAt: { $lt: now } },
          { lastHeartbeatAt: { $lt: staleRunningBefore } },
          { lastHeartbeatAt: null, startedAt: { $lt: staleRunningBefore } },
        ],
      }),
      AdminContentJob.countDocuments({
        status: 'queued',
        createdAt: { $lt: staleQueuedBefore },
        ...buildExecutableJobQuery(),
      }),
      AdminContentJob.findOne({
        status: 'running',
        $or: [
          { leaseExpiresAt: { $lt: now } },
          { lastHeartbeatAt: { $lt: staleRunningBefore } },
          { lastHeartbeatAt: null, startedAt: { $lt: staleRunningBefore } },
        ],
      })
        .sort({ startedAt: 1, createdAt: 1 })
        .select('_id type status attemptCount maxAttempts workerId startedAt lastHeartbeatAt leaseExpiresAt')
        .lean(),
    ])

    const totalStale = staleRunningCount + staleQueuedCount
    if (totalStale < JOB_STALE_ALERT_MIN_COUNT) {
      return []
    }

    const bucket = Math.floor(now.getTime() / (15 * 60 * 1000))
    const severity: AdminOperationalAlertSeverity =
      totalStale >= JOB_STALE_ALERT_MIN_COUNT * 2 || staleRunningCount >= JOB_STALE_ALERT_MIN_COUNT
        ? 'critical'
        : 'high'

    return [
      {
        id: `jobs-stale-backlog:${bucket}`,
        type: 'content_jobs_stale_backlog',
        severity,
        title: 'Backlog stale de jobs de moderacao',
        description: `${totalStale} jobs stale detetados (${staleRunningCount} running + ${staleQueuedCount} queued) acima do baseline operacional.`,
        action: 'admin.content.jobs.worker_status.read',
        resourceType: 'content_job',
        resourceId: 'backlog',
        detectedAt: now.toISOString(),
        actor: null,
        metadata: {
          totalStale,
          staleRunningCount,
          staleQueuedCount,
          staleRunningMinutes: JOB_STALE_RUNNING_MINUTES,
          staleQueuedMinutes: JOB_STALE_QUEUED_MINUTES,
          minCountThreshold: JOB_STALE_ALERT_MIN_COUNT,
          oldestRunningJob:
            oldestRunningJob && typeof oldestRunningJob === 'object'
              ? {
                  id: resolveAnyId((oldestRunningJob as { _id?: unknown })._id),
                  type:
                    (oldestRunningJob as { type?: unknown }).type &&
                    typeof (oldestRunningJob as { type?: unknown }).type === 'string'
                      ? ((oldestRunningJob as { type: string }).type as string)
                      : null,
                  status:
                    (oldestRunningJob as { status?: unknown }).status &&
                    typeof (oldestRunningJob as { status?: unknown }).status === 'string'
                      ? ((oldestRunningJob as { status: string }).status as string)
                      : null,
                  attemptCount:
                    typeof (oldestRunningJob as { attemptCount?: unknown }).attemptCount === 'number'
                      ? (oldestRunningJob as { attemptCount: number }).attemptCount
                      : null,
                  maxAttempts:
                    typeof (oldestRunningJob as { maxAttempts?: unknown }).maxAttempts === 'number'
                      ? (oldestRunningJob as { maxAttempts: number }).maxAttempts
                      : null,
                  workerId: toStringSafe((oldestRunningJob as { workerId?: unknown }).workerId),
                  startedAt: toDate((oldestRunningJob as { startedAt?: unknown }).startedAt)?.toISOString(),
                  lastHeartbeatAt: toDate(
                    (oldestRunningJob as { lastHeartbeatAt?: unknown }).lastHeartbeatAt
                  )?.toISOString(),
                  leaseExpiresAt: toDate(
                    (oldestRunningJob as { leaseExpiresAt?: unknown }).leaseExpiresAt
                  )?.toISOString(),
                }
              : null,
        },
      },
    ]
  }

  private async listRetrySpikeAlerts(windowStart: Date): Promise<AdminOperationalAlert[]> {
    const rows = (await AdminContentJob.find({
      attemptCount: { $gte: 2 },
      lastAttemptAt: { $gte: windowStart },
      $or: [
        { status: 'running' },
        { status: 'failed' },
        {
          status: 'queued',
          ...buildExecutableJobQuery(),
        },
      ],
    })
      .sort({ lastAttemptAt: -1 })
      .limit(250)
      .select('status type attemptCount maxAttempts createdAt lastAttemptAt')
      .lean()) as Array<{
      status?: string
      type?: string
      attemptCount?: number
      maxAttempts?: number
      createdAt?: Date
      lastAttemptAt?: Date | null
    }>

    if (rows.length < JOB_RETRY_SPIKE_MIN_JOBS) {
      return []
    }

    let queued = 0
    let running = 0
    let failed = 0
    let exhausted = 0
    let nearExhaustion = 0
    let maxAttemptObserved = 0

    for (const row of rows) {
      if (row.status === 'queued') queued += 1
      if (row.status === 'running') running += 1
      if (row.status === 'failed') failed += 1

      const attemptCount = typeof row.attemptCount === 'number' ? row.attemptCount : 0
      const maxAttempts = typeof row.maxAttempts === 'number' ? row.maxAttempts : 0
      maxAttemptObserved = Math.max(maxAttemptObserved, attemptCount)

      if (maxAttempts > 0 && attemptCount >= maxAttempts) {
        exhausted += 1
      } else if (maxAttempts > 1 && attemptCount >= maxAttempts - 1) {
        nearExhaustion += 1
      }
    }

    const detectedAt =
      rows
        .map((row) => toDate(row.lastAttemptAt))
        .filter((value): value is Date => value instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date()

    const severity: AdminOperationalAlertSeverity =
      exhausted > 0 || rows.length >= JOB_RETRY_SPIKE_MIN_JOBS * 2 ? 'critical' : 'high'
    const bucket = Math.floor(detectedAt.getTime() / (15 * 60 * 1000))

    return [
      {
        id: `jobs-retry-spike:${bucket}`,
        type: 'content_jobs_retry_spike',
        severity,
        title: 'Spike de retries em jobs de moderacao',
        description: `${rows.length} jobs com retries no periodo (${running} running, ${queued} queued, ${failed} failed).`,
        action: 'admin.content.jobs.worker_status.read',
        resourceType: 'content_job',
        resourceId: 'retries',
        detectedAt: detectedAt.toISOString(),
        actor: null,
        metadata: {
          jobsWithRetries: rows.length,
          queued,
          running,
          failed,
          exhaustedAttempts: exhausted,
          nearExhaustion,
          maxAttemptObserved,
          minJobsThreshold: JOB_RETRY_SPIKE_MIN_JOBS,
          windowStart: windowStart.toISOString(),
        },
      },
    ]
  }

  private async listFalsePositiveSpikeAlerts(windowStart: Date): Promise<AdminOperationalAlert[]> {
    const [totalEvents, automatedRelatedEvents, byCategoryRows, creatorsRows] = await Promise.all([
      ContentFalsePositiveFeedback.countDocuments({ createdAt: { $gte: windowStart } }),
      ContentFalsePositiveFeedback.countDocuments({
        createdAt: { $gte: windowStart },
        categories: { $in: ['policy_auto_hide', 'automated_detection'] },
      }),
      ContentFalsePositiveFeedback.aggregate<{ _id: string | null; count: number }>([
        { $match: { createdAt: { $gte: windowStart } } },
        { $unwind: '$categories' },
        { $group: { _id: '$categories', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ContentFalsePositiveFeedback.aggregate<{ _id: mongoose.Types.ObjectId | null; count: number }>([
        {
          $match: {
            createdAt: { $gte: windowStart },
            creatorId: { $ne: null },
          },
        },
        { $group: { _id: '$creatorId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ])

    if (totalEvents < FALSE_POSITIVE_SPIKE_MIN_EVENTS) {
      return []
    }

    const now = new Date()
    const automatedSharePercent = Math.round((automatedRelatedEvents / Math.max(totalEvents, 1)) * 100)
    const severity: AdminOperationalAlertSeverity =
      totalEvents >= FALSE_POSITIVE_SPIKE_MIN_EVENTS * 2 || automatedSharePercent >= 60
        ? 'critical'
        : 'high'
    const bucket = Math.floor(now.getTime() / (15 * 60 * 1000))

    return [
      {
        id: `false-positive-spike:${bucket}`,
        type: 'false_positive_spike',
        severity,
        title: 'Spike de marcacoes de falso positivo',
        description: `${totalEvents} marcacoes de falso positivo no periodo; ${automatedSharePercent}% associadas a automacao.`,
        action: 'admin.content.rollback',
        resourceType: 'content_false_positive_feedback',
        resourceId: 'false_positive_feedback',
        detectedAt: now.toISOString(),
        actor: null,
        metadata: {
          totalEvents,
          automatedRelatedEvents,
          automatedSharePercent,
          minEventsThreshold: FALSE_POSITIVE_SPIKE_MIN_EVENTS,
          topCategories: byCategoryRows
            .filter((row) => typeof row._id === 'string')
            .map((row) => ({ category: row._id as string, count: row.count })),
          topCreators: creatorsRows
            .filter((row) => row._id instanceof mongoose.Types.ObjectId)
            .map((row) => ({
              creatorId: String(row._id),
              count: row.count,
            })),
          windowStart: windowStart.toISOString(),
        },
      },
    ]
  }

  private async listPlatformIntegrationHealthAlerts(
    limit: number
  ): Promise<AdminOperationalAlert[]> {
    const snapshot = await platformIntegrationConfigService.listIntegrations()

    const degraded = snapshot.items
      .filter(
        (item) =>
          item.health.status === 'warning' || item.health.status === 'error'
      )
      .slice(0, limit)

    const alerts: AdminOperationalAlert[] = []
    for (const item of degraded) {
      const severity: AdminOperationalAlertSeverity =
        item.health.status === 'error' ? 'critical' : 'high'
      const detectedAt = item.updatedAt ?? item.health.checkedAt ?? snapshot.generatedAt

      alerts.push({
        id: `integration-health:${item.key}:${item.health.status}`,
        type: 'platform_integration_health_degraded',
        severity,
        title: 'Integracao com health degradado',
        description: `${item.label} esta em estado ${item.health.status} e requer revisao de configuracao.`,
        action: 'admin.platform.integrations.update',
        resourceType: 'platform_integration_config',
        resourceId: item.key,
        detectedAt: detectedAt.toISOString(),
        actor: item.updatedBy
          ? {
              id: item.updatedBy.id,
              name: item.updatedBy.name,
              username: item.updatedBy.username,
              email: item.updatedBy.email,
              role: toRole(item.updatedBy.role),
            }
          : null,
        metadata: {
          integrationKey: item.key,
          category: item.category,
          enabled: item.enabled,
          historyCount: item.historyCount,
          healthStatus: item.health.status,
          healthSummary: item.health.summary,
          healthIssues: item.health.issues,
          checkedAt: item.health.checkedAt.toISOString(),
        },
      })
    }

    return alerts
  }
}

export const adminOperationalAlertsService = new AdminOperationalAlertsService()
