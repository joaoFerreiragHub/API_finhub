import mongoose from 'mongoose'
import { AdminAuditOutcome, AdminAuditLog } from '../models/AdminAuditLog'
import { AdminContentJob, AdminContentJobStatus, AdminContentJobType } from '../models/AdminContentJob'
import { Article } from '../models/Article'
import {
  AutomatedModerationRule,
  AutomatedModerationSeverity,
  AutomatedModerationSignal,
} from '../models/AutomatedModerationSignal'
import { Book } from '../models/Book'
import { Comment } from '../models/Comment'
import { ContentFalsePositiveFeedback } from '../models/ContentFalsePositiveFeedback'
import { ContentType } from '../models/BaseContent'
import { ContentReport, ContentReportReason } from '../models/ContentReport'
import { ContentModerationEvent, ModeratableContentType } from '../models/ContentModerationEvent'
import { Course } from '../models/Course'
import { Favorite } from '../models/Favorite'
import { Follow } from '../models/Follow'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Rating } from '../models/Rating'
import { UserModerationEvent } from '../models/UserModerationEvent'
import { CreatorOperationalAction, User, UserRole } from '../models/User'
import { Video } from '../models/Video'
import { getMetricsSnapshot } from '../observability/metrics'
import { adminContentService } from './adminContent.service'
import { buildReportSignalSummary, isPriorityAtLeast } from './contentReport.service'
import { CreatorRiskLevel, creatorTrustService } from './creatorTrust.service'
import { surfaceControlService } from './surfaceControl.service'

type StatusClass = '2xx' | '3xx' | '4xx' | '5xx'

interface CountableModel {
  countDocuments(query: Record<string, unknown>): Promise<number>
}

interface CreatedAtModel {
  find(query: Record<string, unknown>): {
    select(fields: string): {
      lean(): Promise<Array<{ _id: mongoose.Types.ObjectId; createdAt?: Date | null }>>
    }
  }
}

interface CountAndCreatedAtModel extends CountableModel, CreatedAtModel {}

type QueueCountsByType = Record<ModeratableContentType, number>
type VolumeByType = Record<ModeratableContentType, number>

interface InteractionBreakdown {
  follows: number
  favorites: number
  comments: number
  reviews: number
}

interface AdminRouteLatency {
  method: string
  route: string
  requests: number
  avgLatencyMs: number
}

interface AdminRouteErrors {
  method: string
  route: string
  requests: number
  errors5xx: number
  errorRatePercent: number
}

type CreatorControlActionCounts = Record<CreatorOperationalAction, number>
type CreatorRiskLevelCounts = Record<CreatorRiskLevel, number>
type AutomatedModerationRuleCounts = Record<AutomatedModerationRule, number>
type ContentJobTypeCounts = Record<AdminContentJobType, number>

export interface AdminMetricsOverview {
  generatedAt: string
  windows: {
    last24hStart: string
    last7dStart: string
    last30dStart: string
  }
  usage: {
    dau: number
    wau: number
    mau: number
    totalUsers: number
    newUsers: {
      last24h: number
      last7d: number
      last30d: number
    }
    retention: {
      cohortWindowDays: 30
      activityWindowDays: 7
      eligibleUsers: number
      retainedUsers: number
      retainedRatePercent: number
    }
    roleDistribution: Record<UserRole, number>
    funnel30d: {
      registered: number
      active30d: number
      premiumOrHigher: number
      creatorOrAdmin: number
    }
  }
  engagement: {
    interactions: {
      last24h: number
      last7d: number
      last30d: number
    }
    breakdown: {
      last24h: InteractionBreakdown
      last7d: InteractionBreakdown
      last30d: InteractionBreakdown
    }
    contentPublishedLast7d: {
      total: number
      byType: Record<ContentType, number>
    }
  }
  moderation: {
    queue: {
      total: number
      hidden: number
      restricted: number
      visible: number
      byType: {
        total: QueueCountsByType
        hidden: QueueCountsByType
        restricted: QueueCountsByType
      }
    }
    actions: {
      last24h: number
      last7d: number
      volumeByTypeLast7d: VolumeByType
    }
    resolution: {
      sampleSize: number
      averageHours: number | null
      medianHours: number | null
    }
    recidivismLast30d: {
      repeatedTargets: number
      repeatedActors: number
    }
    reports: {
      openTotal: number
      highPriorityTargets: number
      criticalTargets: number
      topReasons: Array<{ reason: ContentReportReason; count: number }>
      intake: {
        last24h: number
        last7d: number
      }
      resolved: {
        last24h: number
        last7d: number
      }
    }
    automation: {
      policyAutoHide: {
        successLast24h: number
        successLast7d: number
        errorLast24h: number
        errorLast7d: number
      }
      automatedDetection: {
        activeSignals: number
        highRiskTargets: number
        criticalTargets: number
        byRule: AutomatedModerationRuleCounts
        autoHide: {
          successLast24h: number
          successLast7d: number
          errorLast24h: number
          errorLast7d: number
        }
      }
    }
    creatorControls: {
      active: {
        affectedCreators: number
        creationBlocked: number
        publishingBlocked: number
        cooldownActive: number
        fullyRestricted: number
      }
      actions: {
        last24h: number
        last7d: number
        byActionLast7d: CreatorControlActionCounts
      }
    }
    creatorTrust: {
      creatorsEvaluated: number
      needingIntervention: number
      byRiskLevel: CreatorRiskLevelCounts
      falsePositiveEventsLast30d: number
      creatorsWithFalsePositiveHistory: number
    }
    jobs: {
      queued: number
      running: number
      completedLast24h: number
      failedLast24h: number
      byTypeActive: ContentJobTypeCounts
      averageDurationMinutesLast7d: number | null
    }
  }
  operations: {
    source: 'in_memory_since_process_boot'
    snapshotGeneratedAt: string
    processUptimeSeconds: number
    mongoReady: boolean
    totalRequests: number
    statusClassCounts: Record<StatusClass, number>
    errorRatePercent: number
    availabilityPercent: number
    avgLatencyMs: number
    topSlowRoutes: AdminRouteLatency[]
    topErrorRoutes: AdminRouteErrors[]
    adminAuditLast24h: {
      success: number
      forbidden: number
      error: number
      total: number
    }
  }
}

export interface AdminMetricsDrilldown {
  generatedAt: string
  creators: Array<{
    creatorId: string
    name: string
    username: string
    riskLevel: CreatorRiskLevel
    trustScore: number
    recommendedAction: string
    openReports: number
    criticalTargets: number
    activeControls: number
    falsePositiveEvents30d: number
    falsePositiveRate30d: number
  }>
  targets: Array<{
    contentType: ModeratableContentType
    contentId: string
    title: string
    moderationStatus: string
    reportPriority: string
    openReports: number
    automatedSeverity: string
    creatorRiskLevel: CreatorRiskLevel | null
    surfaceKey: string
    creator: {
      id: string
      name?: string
      username?: string
    } | null
  }>
  surfaces: Array<{
    key: string
    label: string
    enabled: boolean
    impact: string
    affectedFlaggedTargets: number
    affectedCriticalTargets: number
    activeAutomatedSignals: number
    updatedAt: string | null
    publicMessage: string | null
  }>
  jobs: Array<{
    id: string
    type: AdminContentJobType
    status: AdminContentJobStatus
    requested: number
    processed: number
    succeeded: number
    failed: number
    createdAt: string
    startedAt: string | null
    finishedAt: string | null
    actor: {
      id: string
      name?: string
      username?: string
    } | null
  }>
}

const BASE_CONTENT_TYPES: ContentType[] = ['article', 'video', 'course', 'live', 'podcast', 'book']
const MODERATABLE_TYPES: ModeratableContentType[] = [...BASE_CONTENT_TYPES, 'comment', 'review']
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const contentModelByType: Record<ModeratableContentType, CountAndCreatedAtModel> = {
  article: Article as unknown as CountAndCreatedAtModel,
  video: Video as unknown as CountAndCreatedAtModel,
  course: Course as unknown as CountAndCreatedAtModel,
  live: LiveEvent as unknown as CountAndCreatedAtModel,
  podcast: Podcast as unknown as CountAndCreatedAtModel,
  book: Book as unknown as CountAndCreatedAtModel,
  comment: Comment as unknown as CountAndCreatedAtModel,
  review: Rating as unknown as CountAndCreatedAtModel,
}

const round = (value: number, decimals = 2): number => {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const percentage = (part: number, total: number): number => {
  if (total <= 0) return 0
  return round((part / total) * 100, 2)
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return round((sorted[middle - 1] + sorted[middle]) / 2, 2)
  }

  return round(sorted[middle], 2)
}

const emptyQueueCounts = (): QueueCountsByType => ({
  article: 0,
  video: 0,
  course: 0,
  live: 0,
  podcast: 0,
  book: 0,
  comment: 0,
  review: 0,
})

const emptyVolumeByType = (): VolumeByType => ({
  article: 0,
  video: 0,
  course: 0,
  live: 0,
  podcast: 0,
  book: 0,
  comment: 0,
  review: 0,
})

const emptyRoleDistribution = (): Record<UserRole, number> => ({
  visitor: 0,
  free: 0,
  premium: 0,
  creator: 0,
  admin: 0,
})

const emptyCreatorControlActionCounts = (): CreatorControlActionCounts => ({
  set_cooldown: 0,
  clear_cooldown: 0,
  block_creation: 0,
  unblock_creation: 0,
  block_publishing: 0,
  unblock_publishing: 0,
  suspend_creator_ops: 0,
  restore_creator_ops: 0,
})

const emptyCreatorRiskLevelCounts = (): CreatorRiskLevelCounts => ({
  low: 0,
  medium: 0,
  high: 0,
  critical: 0,
})

const emptyAutomatedModerationRuleCounts = (): AutomatedModerationRuleCounts => ({
  spam: 0,
  suspicious_link: 0,
  flood: 0,
  mass_creation: 0,
})

const emptyContentJobTypeCounts = (): ContentJobTypeCounts => ({
  bulk_moderate: 0,
  bulk_rollback: 0,
})

const toObjectIds = (rawIds: string[]): mongoose.Types.ObjectId[] =>
  rawIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id))

const buildActivityQuery = (since: Date): Record<string, unknown> => ({
  $or: [{ lastActiveAt: { $gte: since } }, { lastLoginAt: { $gte: since } }, { createdAt: { $gte: since } }],
})

const buildModerationQueueQuery = (
  contentType: ModeratableContentType,
  moderationStatus?: 'hidden' | 'restricted'
): Record<string, unknown> => {
  const query: Record<string, unknown> = {}

  if (moderationStatus) {
    query.moderationStatus = moderationStatus
  }

  // O queue de reviews no modulo de moderacao considera apenas entradas com texto.
  if (contentType === 'review') {
    query.review = { $regex: /\S/ }
  }

  return query
}

const getSurfaceKeysForContentType = (contentType: ModeratableContentType): string[] => {
  if (contentType === 'comment') {
    return ['comments_read', 'comments_write']
  }

  if (contentType === 'review') {
    return ['reviews_read', 'reviews_write']
  }

  return ['editorial_home', 'editorial_verticals']
}

const getPrimarySurfaceKeyForContentType = (contentType: ModeratableContentType): string =>
  getSurfaceKeysForContentType(contentType)[0]

const mapStatusCodeToClass = (statusCode: number): StatusClass => {
  if (statusCode >= 500) return '5xx'
  if (statusCode >= 400) return '4xx'
  if (statusCode >= 300) return '3xx'
  return '2xx'
}

export class AdminMetricsService {
  async getOverview(): Promise<AdminMetricsOverview> {
    const now = new Date()
    const last24hStart = new Date(now.getTime() - DAY_MS)
    const last7dStart = new Date(now.getTime() - 7 * DAY_MS)
    const last30dStart = new Date(now.getTime() - 30 * DAY_MS)

    const [usage, engagement, moderation, operations] = await Promise.all([
      this.buildUsageMetrics(last24hStart, last7dStart, last30dStart),
      this.buildEngagementMetrics(last24hStart, last7dStart, last30dStart),
      this.buildModerationMetrics(last24hStart, last7dStart, last30dStart),
      this.buildOperationsMetrics(last24hStart),
    ])

    return {
      generatedAt: now.toISOString(),
      windows: {
        last24hStart: last24hStart.toISOString(),
        last7dStart: last7dStart.toISOString(),
        last30dStart: last30dStart.toISOString(),
      },
      usage,
      engagement,
      moderation,
      operations,
    }
  }

  async getDrilldown(limit = 6): Promise<AdminMetricsDrilldown> {
    const now = new Date()
    const normalizedLimit = Math.min(Math.max(Math.floor(limit) || 6, 1), 12)

    const [creatorRows, flaggedQueue, surfaceControls, jobRows] = await Promise.all([
      User.find({ role: 'creator' })
        .select('_id name username creatorControls')
        .lean<Array<{ _id: mongoose.Types.ObjectId; name?: string; username?: string; creatorControls?: any }>>(),
      adminContentService.listQueue({ flaggedOnly: true }, { page: 1, limit: Math.max(normalizedLimit * 4, 24) }),
      surfaceControlService.listControls(),
      AdminContentJob.find({})
        .sort({ createdAt: -1 })
        .limit(normalizedLimit)
        .populate('actor', 'name username email role')
        .lean(),
    ])

    const creatorSignals = await creatorTrustService.getSignalsForCreators(
      creatorRows.map((row) => String(row._id))
    )

    const creators = creatorRows
      .map((row) => {
        const signal = creatorSignals.get(String(row._id))
        if (!signal) return null

        const activeControls = signal.summary.activeControlFlags.length
        return {
          creatorId: String(row._id),
          name: row.name ?? row.username ?? String(row._id),
          username: row.username ?? String(row._id),
          riskLevel: signal.riskLevel,
          trustScore: signal.trustScore,
          recommendedAction: signal.recommendedAction,
          openReports: signal.summary.openReports,
          criticalTargets: signal.summary.criticalTargets,
          activeControls,
          falsePositiveEvents30d: signal.summary.falsePositiveEvents30d,
          falsePositiveRate30d: signal.summary.falsePositiveRate30d,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        const riskOrder: Record<CreatorRiskLevel, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        }

        const riskDelta = riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
        if (riskDelta !== 0) return riskDelta

        if (a.trustScore !== b.trustScore) return a.trustScore - b.trustScore
        return b.openReports - a.openReports
      })
      .slice(0, normalizedLimit)

    const targets = flaggedQueue.items.slice(0, normalizedLimit).map((item) => ({
      contentType: item.contentType,
      contentId: item.id,
      title: item.title,
      moderationStatus: item.moderationStatus,
      reportPriority: item.reportSignals.priority,
      openReports: item.reportSignals.openReports,
      automatedSeverity: item.automatedSignals.severity,
      creatorRiskLevel: item.creatorTrustSignals?.riskLevel ?? null,
      surfaceKey: getPrimarySurfaceKeyForContentType(item.contentType),
      creator: item.creator
        ? {
            id: typeof item.creator._id === 'string' ? item.creator._id : String(item.creator._id ?? item.creator.id),
            name: item.creator.name,
            username: item.creator.username,
          }
        : null,
    }))

    const surfaceAggregates = new Map<
      string,
      { flagged: number; critical: number; automated: number }
    >()

    for (const item of flaggedQueue.items) {
      for (const surfaceKey of getSurfaceKeysForContentType(item.contentType)) {
        const current = surfaceAggregates.get(surfaceKey) ?? {
          flagged: 0,
          critical: 0,
          automated: 0,
        }

        current.flagged += 1
        if (
          item.reportSignals.priority === 'critical' ||
          item.creatorTrustSignals?.riskLevel === 'critical'
        ) {
          current.critical += 1
        }
        if (item.automatedSignals.active) {
          current.automated += 1
        }

        surfaceAggregates.set(surfaceKey, current)
      }
    }

    const surfaces = surfaceControls.items.map((item) => {
      const aggregate = surfaceAggregates.get(item.key) ?? {
        flagged: 0,
        critical: 0,
        automated: 0,
      }

      return {
        key: item.key,
        label: item.label,
        enabled: item.enabled,
        impact: item.impact,
        affectedFlaggedTargets: aggregate.flagged,
        affectedCriticalTargets: aggregate.critical,
        activeAutomatedSignals: aggregate.automated,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
        publicMessage: item.publicMessage ?? null,
      }
    })

    const jobs = jobRows.map((item: any) => ({
      id: String(item._id),
      type: item.type as AdminContentJobType,
      status: item.status as AdminContentJobStatus,
      requested: Number(item.progress?.requested ?? 0),
      processed: Number(item.progress?.processed ?? 0),
      succeeded: Number(item.progress?.succeeded ?? 0),
      failed: Number(item.progress?.failed ?? 0),
      createdAt: new Date(item.createdAt).toISOString(),
      startedAt: item.startedAt ? new Date(item.startedAt).toISOString() : null,
      finishedAt: item.finishedAt ? new Date(item.finishedAt).toISOString() : null,
      actor: item.actor
        ? {
            id: String(item.actor._id ?? item.actor.id),
            name: item.actor.name,
            username: item.actor.username,
          }
        : null,
    }))

    return {
      generatedAt: now.toISOString(),
      creators,
      targets,
      surfaces,
      jobs,
    }
  }

  private async buildUsageMetrics(last24hStart: Date, last7dStart: Date, last30dStart: Date) {
    const retentionCohortEnd = last7dStart

    const [dau, wau, mau, totalUsers, newUsers24h, newUsers7d, newUsers30d, roleDistributionRows, eligibleUsers, retainedUsers] =
      await Promise.all([
        User.countDocuments(buildActivityQuery(last24hStart)),
        User.countDocuments(buildActivityQuery(last7dStart)),
        User.countDocuments(buildActivityQuery(last30dStart)),
        User.countDocuments({}),
        User.countDocuments({ createdAt: { $gte: last24hStart } }),
        User.countDocuments({ createdAt: { $gte: last7dStart } }),
        User.countDocuments({ createdAt: { $gte: last30dStart } }),
        User.aggregate<{ _id: UserRole; count: number }>([
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ]),
        User.countDocuments({
          createdAt: {
            $gte: last30dStart,
            $lt: retentionCohortEnd,
          },
        }),
        User.countDocuments({
          createdAt: {
            $gte: last30dStart,
            $lt: retentionCohortEnd,
          },
          $or: [{ lastActiveAt: { $gte: last7dStart } }, { lastLoginAt: { $gte: last7dStart } }],
        }),
      ])

    const roleDistribution = emptyRoleDistribution()
    for (const row of roleDistributionRows) {
      if (row._id in roleDistribution) {
        roleDistribution[row._id] = row.count
      }
    }

    return {
      dau,
      wau,
      mau,
      totalUsers,
      newUsers: {
        last24h: newUsers24h,
        last7d: newUsers7d,
        last30d: newUsers30d,
      },
      retention: {
        cohortWindowDays: 30 as const,
        activityWindowDays: 7 as const,
        eligibleUsers,
        retainedUsers,
        retainedRatePercent: percentage(retainedUsers, eligibleUsers),
      },
      roleDistribution,
      funnel30d: {
        registered: totalUsers,
        active30d: mau,
        premiumOrHigher: roleDistribution.premium + roleDistribution.creator + roleDistribution.admin,
        creatorOrAdmin: roleDistribution.creator + roleDistribution.admin,
      },
    }
  }

  private async buildEngagementMetrics(last24hStart: Date, last7dStart: Date, last30dStart: Date) {
    const [follows24h, follows7d, follows30d, favorites24h, favorites7d, favorites30d, comments24h, comments7d, comments30d, reviews24h, reviews7d, reviews30d] =
      await Promise.all([
        Follow.countDocuments({ createdAt: { $gte: last24hStart } }),
        Follow.countDocuments({ createdAt: { $gte: last7dStart } }),
        Follow.countDocuments({ createdAt: { $gte: last30dStart } }),
        Favorite.countDocuments({ createdAt: { $gte: last24hStart } }),
        Favorite.countDocuments({ createdAt: { $gte: last7dStart } }),
        Favorite.countDocuments({ createdAt: { $gte: last30dStart } }),
        Comment.countDocuments({ createdAt: { $gte: last24hStart } }),
        Comment.countDocuments({ createdAt: { $gte: last7dStart } }),
        Comment.countDocuments({ createdAt: { $gte: last30dStart } }),
        Rating.countDocuments({ createdAt: { $gte: last24hStart } }),
        Rating.countDocuments({ createdAt: { $gte: last7dStart } }),
        Rating.countDocuments({ createdAt: { $gte: last30dStart } }),
      ])

    const contentPublishedRows = await Promise.all(
      BASE_CONTENT_TYPES.map(async (type) => {
        const model = contentModelByType[type]
        const count = await model.countDocuments({
          status: 'published',
          createdAt: { $gte: last7dStart },
        })
        return [type, count] as const
      })
    )

    const contentPublishedByType = BASE_CONTENT_TYPES.reduce<Record<ContentType, number>>(
      (acc, type) => {
        acc[type] = 0
        return acc
      },
      {
        article: 0,
        video: 0,
        course: 0,
        live: 0,
        podcast: 0,
        book: 0,
      }
    )

    for (const [type, count] of contentPublishedRows) {
      contentPublishedByType[type] = count
    }

    const breakdown24h: InteractionBreakdown = {
      follows: follows24h,
      favorites: favorites24h,
      comments: comments24h,
      reviews: reviews24h,
    }
    const breakdown7d: InteractionBreakdown = {
      follows: follows7d,
      favorites: favorites7d,
      comments: comments7d,
      reviews: reviews7d,
    }
    const breakdown30d: InteractionBreakdown = {
      follows: follows30d,
      favorites: favorites30d,
      comments: comments30d,
      reviews: reviews30d,
    }

    const total24h = follows24h + favorites24h + comments24h + reviews24h
    const total7d = follows7d + favorites7d + comments7d + reviews7d
    const total30d = follows30d + favorites30d + comments30d + reviews30d
    const contentPublishedTotal = BASE_CONTENT_TYPES.reduce(
      (sum, type) => sum + contentPublishedByType[type],
      0
    )

    return {
      interactions: {
        last24h: total24h,
        last7d: total7d,
        last30d: total30d,
      },
      breakdown: {
        last24h: breakdown24h,
        last7d: breakdown7d,
        last30d: breakdown30d,
      },
      contentPublishedLast7d: {
        total: contentPublishedTotal,
        byType: contentPublishedByType,
      },
    }
  }

  private async buildModerationMetrics(last24hStart: Date, last7dStart: Date, last30dStart: Date) {
    const now = new Date()
    const [queueTotalByType, queueHiddenByType, queueRestrictedByType] = await Promise.all([
      this.countQueueByType(),
      this.countQueueByType('hidden'),
      this.countQueueByType('restricted'),
    ])

    const queueTotal = MODERATABLE_TYPES.reduce((sum, type) => sum + queueTotalByType[type], 0)
    const queueHidden = MODERATABLE_TYPES.reduce((sum, type) => sum + queueHiddenByType[type], 0)
    const queueRestricted = MODERATABLE_TYPES.reduce(
      (sum, type) => sum + queueRestrictedByType[type],
      0
    )
    const queueVisible = Math.max(queueTotal - queueHidden - queueRestricted, 0)

    const [
      actions24h,
      actions7d,
      volumeRows,
      resolutionDurationsHours,
      repeatTargetsRows,
      repeatActorsRows,
      openReportsTotal,
      reportsCreated24h,
      reportsCreated7d,
      reportsResolved24h,
      reportsResolved7d,
      openReportReasonRows,
      openReportTargetRows,
      activeAutomatedSignalsTotal,
      activeAutomatedSignalRows,
      automatedSignalRuleRows,
      autoHideSuccess24h,
      autoHideSuccess7d,
      autoHideError24h,
      autoHideError7d,
      automatedDetectionAutoHideSuccess24h,
      automatedDetectionAutoHideSuccess7d,
      automatedDetectionAutoHideError24h,
      automatedDetectionAutoHideError7d,
      creationBlockedCreators,
      publishingBlockedCreators,
      cooldownActiveCreators,
      affectedCreators,
      fullyRestrictedCreators,
      creatorControlActions24h,
      creatorControlActions7d,
      creatorControlActionRows,
      creatorRows,
      falsePositiveEventsLast30d,
      falsePositiveCreatorRows,
      queuedJobs,
      runningJobs,
      completedJobs24h,
      failedJobs24h,
      activeJobTypeRows,
      completedJobs7d,
    ] = await Promise.all([
      ContentModerationEvent.countDocuments({ createdAt: { $gte: last24hStart } }),
      ContentModerationEvent.countDocuments({ createdAt: { $gte: last7dStart } }),
      ContentModerationEvent.aggregate<{ _id: ModeratableContentType; count: number }>([
        { $match: { createdAt: { $gte: last7dStart } } },
        { $group: { _id: '$contentType', count: { $sum: 1 } } },
      ]),
      this.calculateResolutionDurationsHours(last7dStart),
      ContentModerationEvent.aggregate<{ total: number }>([
        { $match: { createdAt: { $gte: last30dStart } } },
        {
          $group: {
            _id: { contentType: '$contentType', contentId: '$contentId' },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $count: 'total' },
      ]),
      ContentModerationEvent.aggregate<{ total: number }>([
        { $match: { createdAt: { $gte: last30dStart } } },
        { $group: { _id: '$actor', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'total' },
      ]),
      ContentReport.countDocuments({ status: 'open' }),
      ContentReport.countDocuments({ createdAt: { $gte: last24hStart } }),
      ContentReport.countDocuments({ createdAt: { $gte: last7dStart } }),
      ContentReport.countDocuments({ status: 'reviewed', reviewedAt: { $gte: last24hStart } }),
      ContentReport.countDocuments({ status: 'reviewed', reviewedAt: { $gte: last7dStart } }),
      ContentReport.aggregate<{ _id: ContentReportReason; count: number }>([
        { $match: { status: 'open' } },
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 5 },
      ]),
      ContentReport.aggregate<{
        _id: { contentType: ModeratableContentType; contentId: string }
        openReports: number
        uniqueReporterIds: mongoose.Types.ObjectId[]
        latestReportAt: Date | null
        reasons: ContentReportReason[]
      }>([
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
      ]),
      AutomatedModerationSignal.countDocuments({ status: 'active' }),
      AutomatedModerationSignal.find({ status: 'active' })
        .select('severity')
        .lean<Array<{ severity: AutomatedModerationSeverity }>>(),
      AutomatedModerationSignal.aggregate<{ _id: AutomatedModerationRule | null; count: number }>([
        { $match: { status: 'active' } },
        { $unwind: '$triggeredRules' },
        { $group: { _id: '$triggeredRules.rule', count: { $sum: 1 } } },
      ]),
      AdminAuditLog.countDocuments({
        action: 'admin.content.policy_auto_hide',
        outcome: 'success',
        createdAt: { $gte: last24hStart },
      }),
      AdminAuditLog.countDocuments({
        action: 'admin.content.policy_auto_hide',
        outcome: 'success',
        createdAt: { $gte: last7dStart },
      }),
      AdminAuditLog.countDocuments({
        action: 'admin.content.policy_auto_hide',
        outcome: 'error',
        createdAt: { $gte: last24hStart },
      }),
      AdminAuditLog.countDocuments({
        action: 'admin.content.policy_auto_hide',
        outcome: 'error',
        createdAt: { $gte: last7dStart },
      }),
      AdminAuditLog.countDocuments({
        action: 'admin.content.automated_detection_auto_hide',
        outcome: 'success',
        createdAt: { $gte: last24hStart },
      }),
      AdminAuditLog.countDocuments({
        action: 'admin.content.automated_detection_auto_hide',
        outcome: 'success',
        createdAt: { $gte: last7dStart },
      }),
      AdminAuditLog.countDocuments({
        action: 'admin.content.automated_detection_auto_hide',
        outcome: 'error',
        createdAt: { $gte: last24hStart },
      }),
      AdminAuditLog.countDocuments({
        action: 'admin.content.automated_detection_auto_hide',
        outcome: 'error',
        createdAt: { $gte: last7dStart },
      }),
      User.countDocuments({ role: 'creator', 'creatorControls.creationBlocked': true }),
      User.countDocuments({ role: 'creator', 'creatorControls.publishingBlocked': true }),
      User.countDocuments({ role: 'creator', 'creatorControls.cooldownUntil': { $gt: now } }),
      User.countDocuments({
        role: 'creator',
        $or: [
          { 'creatorControls.creationBlocked': true },
          { 'creatorControls.publishingBlocked': true },
          { 'creatorControls.cooldownUntil': { $gt: now } },
        ],
      }),
      User.countDocuments({
        role: 'creator',
        'creatorControls.creationBlocked': true,
        'creatorControls.publishingBlocked': true,
      }),
      UserModerationEvent.countDocuments({
        action: 'creator_control',
        createdAt: { $gte: last24hStart },
      }),
      UserModerationEvent.countDocuments({
        action: 'creator_control',
        createdAt: { $gte: last7dStart },
      }),
      UserModerationEvent.aggregate<{ _id: CreatorOperationalAction | null; count: number }>([
        {
          $match: {
            action: 'creator_control',
            createdAt: { $gte: last7dStart },
          },
        },
        {
          $group: {
            _id: '$metadata.creatorControlAction',
            count: { $sum: 1 },
          },
        },
      ]),
      User.find({ role: 'creator' }).select('_id').lean<Array<{ _id: mongoose.Types.ObjectId }>>(),
      ContentFalsePositiveFeedback.countDocuments({ createdAt: { $gte: last30dStart } }),
      ContentFalsePositiveFeedback.aggregate<{ _id: mongoose.Types.ObjectId | null; count: number }>([
        {
          $match: {
            creatorId: { $ne: null },
            createdAt: { $gte: last30dStart },
          },
        },
        {
          $group: {
            _id: '$creatorId',
            count: { $sum: 1 },
          },
        },
      ]),
      AdminContentJob.countDocuments({ status: 'queued' }),
      AdminContentJob.countDocuments({ status: 'running' }),
      AdminContentJob.countDocuments({
        status: { $in: ['completed', 'completed_with_errors'] },
        finishedAt: { $gte: last24hStart },
      }),
      AdminContentJob.countDocuments({
        status: 'failed',
        finishedAt: { $gte: last24hStart },
      }),
      AdminContentJob.aggregate<{ _id: AdminContentJobType | null; count: number }>([
        {
          $match: {
            status: { $in: ['queued', 'running'] },
          },
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),
      AdminContentJob.find({
        status: { $in: ['completed', 'completed_with_errors', 'failed'] },
        finishedAt: { $gte: last7dStart },
      })
        .select('createdAt finishedAt')
        .lean<Array<{ createdAt: Date; finishedAt?: Date | null }>>(),
    ])

    const volumeByTypeLast7d = emptyVolumeByType()
    for (const row of volumeRows) {
      if (row._id in volumeByTypeLast7d) {
        volumeByTypeLast7d[row._id] = row.count
      }
    }

    const averageResolution =
      resolutionDurationsHours.length > 0
        ? round(
            resolutionDurationsHours.reduce((sum, value) => sum + value, 0) /
              resolutionDurationsHours.length,
            2
          )
        : null

    let highPriorityTargets = 0
    let criticalTargets = 0
    for (const row of openReportTargetRows) {
      const summary = buildReportSignalSummary({
        openReports: row.openReports,
        uniqueReporters: row.uniqueReporterIds.length,
        latestReportAt: row.latestReportAt,
        reasons: row.reasons,
      })

      if (isPriorityAtLeast(summary.priority, 'high')) {
        highPriorityTargets += 1
      }
      if (summary.priority === 'critical') {
        criticalTargets += 1
      }
    }

    const automatedRuleCounts = emptyAutomatedModerationRuleCounts()
    for (const row of automatedSignalRuleRows) {
      if (row._id && row._id in automatedRuleCounts) {
        automatedRuleCounts[row._id] = row.count
      }
    }

    let automatedHighRiskTargets = 0
    let automatedCriticalTargets = 0
    for (const row of activeAutomatedSignalRows) {
      if (row.severity === 'high' || row.severity === 'critical') {
        automatedHighRiskTargets += 1
      }
      if (row.severity === 'critical') {
        automatedCriticalTargets += 1
      }
    }

    const creatorControlActionsByType = emptyCreatorControlActionCounts()
    for (const row of creatorControlActionRows) {
      if (row._id && row._id in creatorControlActionsByType) {
        creatorControlActionsByType[row._id] = row.count
      }
    }

    const creatorTrustSignals = await creatorTrustService.getSignalsForCreators(
      creatorRows.map((row) => String(row._id))
    )
    const creatorTrustByRiskLevel = emptyCreatorRiskLevelCounts()
    let creatorsNeedingIntervention = 0

    for (const signal of creatorTrustSignals.values()) {
      creatorTrustByRiskLevel[signal.riskLevel] += 1
      if (
        signal.recommendedAction === 'set_cooldown' ||
        signal.recommendedAction === 'block_publishing' ||
        signal.recommendedAction === 'suspend_creator_ops'
      ) {
        creatorsNeedingIntervention += 1
      }
    }

    const activeJobsByType = emptyContentJobTypeCounts()
    for (const row of activeJobTypeRows) {
      if (row._id && row._id in activeJobsByType) {
        activeJobsByType[row._id] = row.count
      }
    }

    const completedJobDurations = completedJobs7d
      .filter((job) => job.finishedAt instanceof Date)
      .map((job) => Math.max(job.finishedAt!.getTime() - job.createdAt.getTime(), 0) / 60000)
    const averageJobDurationMinutes =
      completedJobDurations.length > 0
        ? round(
            completedJobDurations.reduce((sum, value) => sum + value, 0) /
              completedJobDurations.length,
            2
          )
        : null

    return {
      queue: {
        total: queueTotal,
        hidden: queueHidden,
        restricted: queueRestricted,
        visible: queueVisible,
        byType: {
          total: queueTotalByType,
          hidden: queueHiddenByType,
          restricted: queueRestrictedByType,
        },
      },
      actions: {
        last24h: actions24h,
        last7d: actions7d,
        volumeByTypeLast7d,
      },
      resolution: {
        sampleSize: resolutionDurationsHours.length,
        averageHours: averageResolution,
        medianHours: median(resolutionDurationsHours),
      },
      recidivismLast30d: {
        repeatedTargets: repeatTargetsRows[0]?.total ?? 0,
        repeatedActors: repeatActorsRows[0]?.total ?? 0,
      },
      reports: {
        openTotal: openReportsTotal,
        highPriorityTargets,
        criticalTargets,
        topReasons: openReportReasonRows.map((row) => ({
          reason: row._id,
          count: row.count,
        })),
        intake: {
          last24h: reportsCreated24h,
          last7d: reportsCreated7d,
        },
        resolved: {
          last24h: reportsResolved24h,
          last7d: reportsResolved7d,
        },
      },
      automation: {
        policyAutoHide: {
          successLast24h: autoHideSuccess24h,
          successLast7d: autoHideSuccess7d,
          errorLast24h: autoHideError24h,
          errorLast7d: autoHideError7d,
        },
        automatedDetection: {
          activeSignals: activeAutomatedSignalsTotal,
          highRiskTargets: automatedHighRiskTargets,
          criticalTargets: automatedCriticalTargets,
          byRule: automatedRuleCounts,
          autoHide: {
            successLast24h: automatedDetectionAutoHideSuccess24h,
            successLast7d: automatedDetectionAutoHideSuccess7d,
            errorLast24h: automatedDetectionAutoHideError24h,
            errorLast7d: automatedDetectionAutoHideError7d,
          },
        },
      },
      creatorControls: {
        active: {
          affectedCreators,
          creationBlocked: creationBlockedCreators,
          publishingBlocked: publishingBlockedCreators,
          cooldownActive: cooldownActiveCreators,
          fullyRestricted: fullyRestrictedCreators,
        },
        actions: {
          last24h: creatorControlActions24h,
          last7d: creatorControlActions7d,
          byActionLast7d: creatorControlActionsByType,
        },
      },
      creatorTrust: {
        creatorsEvaluated: creatorTrustSignals.size,
        needingIntervention: creatorsNeedingIntervention,
        byRiskLevel: creatorTrustByRiskLevel,
        falsePositiveEventsLast30d,
        creatorsWithFalsePositiveHistory: falsePositiveCreatorRows.length,
      },
      jobs: {
        queued: queuedJobs,
        running: runningJobs,
        completedLast24h: completedJobs24h,
        failedLast24h: failedJobs24h,
        byTypeActive: activeJobsByType,
        averageDurationMinutesLast7d: averageJobDurationMinutes,
      },
    }
  }

  private async countQueueByType(
    moderationStatus?: 'hidden' | 'restricted'
  ): Promise<QueueCountsByType> {
    const countRows = await Promise.all(
      MODERATABLE_TYPES.map(async (contentType) => {
        const model = contentModelByType[contentType]
        const count = await model.countDocuments(
          buildModerationQueueQuery(contentType, moderationStatus)
        )
        return [contentType, count] as const
      })
    )

    const counts = emptyQueueCounts()
    for (const [contentType, count] of countRows) {
      counts[contentType] = count
    }

    return counts
  }

  private async calculateResolutionDurationsHours(last7dStart: Date): Promise<number[]> {
    const events = await ContentModerationEvent.find({ createdAt: { $gte: last7dStart } })
      .select('contentType contentId createdAt')
      .sort({ createdAt: 1 })
      .lean<
        Array<{
          contentType: ModeratableContentType
          contentId: string
          createdAt: Date
        }>
      >()

    if (events.length === 0) return []

    const firstEventByTarget = new Map<
      string,
      { contentType: ModeratableContentType; contentId: string; createdAt: Date }
    >()

    for (const event of events) {
      const key = `${event.contentType}:${event.contentId}`
      if (!firstEventByTarget.has(key)) {
        firstEventByTarget.set(key, event)
      }
    }

    const idsByType: Record<ModeratableContentType, string[]> = {
      article: [],
      video: [],
      course: [],
      live: [],
      podcast: [],
      book: [],
      comment: [],
      review: [],
    }

    for (const event of firstEventByTarget.values()) {
      idsByType[event.contentType].push(event.contentId)
    }

    const createdAtByTarget = new Map<string, Date>()

    await Promise.all(
      MODERATABLE_TYPES.map(async (contentType) => {
        const ids = idsByType[contentType]
        if (ids.length === 0) return

        const objectIds = toObjectIds(ids)
        if (objectIds.length === 0) return

        const model = contentModelByType[contentType]
        const docs = await model
          .find({ _id: { $in: objectIds } })
          .select('_id createdAt')
          .lean()

        for (const doc of docs) {
          if (doc.createdAt instanceof Date) {
            createdAtByTarget.set(`${contentType}:${String(doc._id)}`, doc.createdAt)
          }
        }
      })
    )

    const durationsHours: number[] = []
    for (const event of firstEventByTarget.values()) {
      const key = `${event.contentType}:${event.contentId}`
      const contentCreatedAt = createdAtByTarget.get(key)
      if (!contentCreatedAt) continue

      const diffMs = event.createdAt.getTime() - contentCreatedAt.getTime()
      if (diffMs >= 0) {
        durationsHours.push(round(diffMs / HOUR_MS, 2))
      }
    }

    return durationsHours
  }

  private async buildOperationsMetrics(last24hStart: Date) {
    const snapshot = getMetricsSnapshot()
    const statusClassCounts: Record<StatusClass, number> = {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    }

    const routeAggregate = new Map<
      string,
      {
        method: string
        route: string
        requests: number
        totalDurationMs: number
        errors5xx: number
      }
    >()

    let totalDurationMs = 0
    let errors5xx = 0

    for (const metric of snapshot.byRoute) {
      const statusClass = mapStatusCodeToClass(metric.statusCode)
      statusClassCounts[statusClass] += metric.count

      totalDurationMs += metric.avgDurationMs * metric.count
      if (metric.statusCode >= 500) {
        errors5xx += metric.count
      }

      const key = `${metric.method}|${metric.route}`
      const current = routeAggregate.get(key) ?? {
        method: metric.method,
        route: metric.route,
        requests: 0,
        totalDurationMs: 0,
        errors5xx: 0,
      }

      current.requests += metric.count
      current.totalDurationMs += metric.avgDurationMs * metric.count
      if (metric.statusCode >= 500) {
        current.errors5xx += metric.count
      }

      routeAggregate.set(key, current)
    }

    const routeAggregates = Array.from(routeAggregate.values())
    const topSlowRoutes: AdminRouteLatency[] = routeAggregates
      .map((item) => ({
        method: item.method,
        route: item.route,
        requests: item.requests,
        avgLatencyMs: round(item.requests > 0 ? item.totalDurationMs / item.requests : 0, 2),
      }))
      .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)
      .slice(0, 5)

    const topErrorRoutes: AdminRouteErrors[] = routeAggregates
      .filter((item) => item.errors5xx > 0)
      .map((item) => ({
        method: item.method,
        route: item.route,
        requests: item.requests,
        errors5xx: item.errors5xx,
        errorRatePercent: percentage(item.errors5xx, item.requests),
      }))
      .sort((a, b) => b.errorRatePercent - a.errorRatePercent || b.errors5xx - a.errors5xx)
      .slice(0, 5)

    const auditRows = await AdminAuditLog.aggregate<{ _id: AdminAuditOutcome; count: number }>([
      { $match: { createdAt: { $gte: last24hStart } } },
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
    ])

    let auditSuccess = 0
    let auditForbidden = 0
    let auditError = 0
    for (const row of auditRows) {
      if (row._id === 'success') auditSuccess = row.count
      if (row._id === 'forbidden') auditForbidden = row.count
      if (row._id === 'error') auditError = row.count
    }

    return {
      source: 'in_memory_since_process_boot' as const,
      snapshotGeneratedAt: snapshot.generatedAt,
      processUptimeSeconds: round(process.uptime(), 2),
      mongoReady: mongoose.connection.readyState === 1,
      totalRequests: snapshot.totalRequests,
      statusClassCounts,
      errorRatePercent: percentage(errors5xx, snapshot.totalRequests),
      availabilityPercent: percentage(snapshot.totalRequests - errors5xx, snapshot.totalRequests),
      avgLatencyMs: round(
        snapshot.totalRequests > 0 ? totalDurationMs / snapshot.totalRequests : 0,
        2
      ),
      topSlowRoutes,
      topErrorRoutes,
      adminAuditLast24h: {
        success: auditSuccess,
        forbidden: auditForbidden,
        error: auditError,
        total: auditSuccess + auditForbidden + auditError,
      },
    }
  }
}

export const adminMetricsService = new AdminMetricsService()
