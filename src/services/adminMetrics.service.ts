import mongoose from 'mongoose'
import { AdminAuditOutcome, AdminAuditLog } from '../models/AdminAuditLog'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Comment } from '../models/Comment'
import { ContentType } from '../models/BaseContent'
import { ContentModerationEvent, ModeratableContentType } from '../models/ContentModerationEvent'
import { Course } from '../models/Course'
import { Favorite } from '../models/Favorite'
import { Follow } from '../models/Follow'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Rating } from '../models/Rating'
import { User, UserRole } from '../models/User'
import { Video } from '../models/Video'
import { getMetricsSnapshot } from '../observability/metrics'

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

    const [actions24h, actions7d, volumeRows, resolutionDurationsHours, repeatTargetsRows, repeatActorsRows] =
      await Promise.all([
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
