import mongoose from 'mongoose'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Course } from '../models/Course'
import { Follow } from '../models/Follow'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { User, UserAccountStatus } from '../models/User'
import { Video } from '../models/Video'
import { CreatorRiskLevel, creatorTrustService } from './creatorTrust.service'
import { resolvePagination } from '../utils/pagination'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_WINDOW_DAYS = 30
const MAX_WINDOW_DAYS = 180
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const MAX_EXPORT_ROWS = 5000

const CONTENT_MODELS = [
  { key: 'article', model: Article },
  { key: 'video', model: Video },
  { key: 'course', model: Course },
  { key: 'live', model: LiveEvent },
  { key: 'podcast', model: Podcast },
  { key: 'book', model: Book },
] as const

type ContentKey = (typeof CONTENT_MODELS)[number]['key']

type SortBy = 'growth' | 'engagement' | 'followers' | 'trust'
type SortOrder = 'asc' | 'desc'

interface CreatorAnalyticsInternal {
  creatorId: string
  creator: {
    id: string
    name: string
    username: string
    email: string
    avatar: string | null
    accountStatus: UserAccountStatus
    followers: number
    following: number
    createdAt: string | null
    lastActiveAt: string | null
  }
  content: {
    total: number
    published: number
    premiumPublished: number
    featuredPublished: number
    byType: Record<ContentKey, { total: number; published: number }>
  }
  growth: {
    windowDays: number
    followsLastWindow: number
    followsPrevWindow: number
    followsDelta: number
    followsTrendPercent: number
    publishedLastWindow: number
    publishedPrevWindow: number
    publishedDelta: number
    score: number
  }
  engagement: {
    views: number
    likes: number
    favorites: number
    comments: number
    ratingsCount: number
    averageRating: number
    actionsTotal: number
    actionsPerPublished: number
    score: number
  }
  trust: {
    trustScore: number
    riskLevel: CreatorRiskLevel
    recommendedAction: string
    openReports: number
    highPriorityTargets: number
    criticalTargets: number
    falsePositiveRate30d: number
  }
}

export interface CreatorPositiveAnalyticsFilters {
  search?: string
  accountStatus?: UserAccountStatus
  riskLevel?: CreatorRiskLevel
}

export interface CreatorPositiveAnalyticsOptions {
  page?: number
  limit?: number
  sortBy?: SortBy
  sortOrder?: SortOrder
  windowDays?: number
}

export class AdminCreatorAnalyticsServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toPositiveInt = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = Math.floor(value)
    return Math.min(max, Math.max(min, parsed))
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return Math.min(max, Math.max(min, parsed))
    }
  }
  return fallback
}

const round = (value: number, decimals = 2): number => {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const escapeCsv = (value: string): string => `"${value.replace(/"/g, '""')}"`

const toCsvSafeValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  try {
    return JSON.stringify(value)
  } catch (_error) {
    return ''
  }
}

const sortRows = (rows: CreatorAnalyticsInternal[], sortBy: SortBy, sortOrder: SortOrder) => {
  const direction = sortOrder === 'asc' ? 1 : -1

  rows.sort((left, right) => {
    const leftValue =
      sortBy === 'growth'
        ? left.growth.score
        : sortBy === 'engagement'
          ? left.engagement.score
          : sortBy === 'followers'
            ? left.creator.followers
            : left.trust.trustScore

    const rightValue =
      sortBy === 'growth'
        ? right.growth.score
        : sortBy === 'engagement'
          ? right.engagement.score
          : sortBy === 'followers'
            ? right.creator.followers
            : right.trust.trustScore

    if (leftValue !== rightValue) return (leftValue - rightValue) * direction

    const tieBreak = left.engagement.score - right.engagement.score
    if (tieBreak !== 0) return tieBreak * direction

    return left.creator.username.localeCompare(right.creator.username) * direction
  })
}

interface ContentAggregateRow {
  _id: mongoose.Types.ObjectId
  totalContent: number
  publishedContent: number
  premiumPublished: number
  featuredPublished: number
  views: number
  likes: number
  favorites: number
  comments: number
  ratingsCount: number
  ratingWeighted: number
  publishedLastWindow: number
  publishedPrevWindow: number
}

interface FollowAggregateRow {
  _id: mongoose.Types.ObjectId
  followsLastWindow: number
  followsPrevWindow: number
}

interface BuildRowsParams {
  filters?: CreatorPositiveAnalyticsFilters
  sortBy: SortBy
  sortOrder: SortOrder
  windowDays: number
}

export class AdminCreatorAnalyticsService {
  async listPositiveAnalytics(
    filters: CreatorPositiveAnalyticsFilters = {},
    options: CreatorPositiveAnalyticsOptions = {}
  ) {
    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const sortBy = this.resolveSortBy(options.sortBy)
    const sortOrder = this.resolveSortOrder(options.sortOrder)
    const windowDays = toPositiveInt(options.windowDays, DEFAULT_WINDOW_DAYS, 7, MAX_WINDOW_DAYS)

    const rows = await this.buildRows({ filters, sortBy, sortOrder, windowDays })
    const total = rows.length
    const pageItems = rows.slice(skip, skip + limit)

    return {
      items: pageItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      sort: {
        sortBy,
        sortOrder,
      },
      summary: {
        totalCreators: total,
        avgGrowthScore:
          total > 0 ? round(rows.reduce((sum, row) => sum + row.growth.score, 0) / total, 2) : 0,
        avgEngagementScore:
          total > 0 ? round(rows.reduce((sum, row) => sum + row.engagement.score, 0) / total, 2) : 0,
        avgTrustScore:
          total > 0 ? round(rows.reduce((sum, row) => sum + row.trust.trustScore, 0) / total, 2) : 0,
      },
    }
  }

  async exportPositiveAnalyticsCsv(
    filters: CreatorPositiveAnalyticsFilters = {},
    options: Omit<CreatorPositiveAnalyticsOptions, 'page' | 'limit'> & { maxRows?: number } = {}
  ) {
    const sortBy = this.resolveSortBy(options.sortBy)
    const sortOrder = this.resolveSortOrder(options.sortOrder)
    const windowDays = toPositiveInt(options.windowDays, DEFAULT_WINDOW_DAYS, 7, MAX_WINDOW_DAYS)
    const maxRows = toPositiveInt(options.maxRows, 2000, 1, MAX_EXPORT_ROWS)

    const rows = await this.buildRows({ filters, sortBy, sortOrder, windowDays })
    const limitedRows = rows.slice(0, maxRows)

    const headers = [
      'creatorId',
      'name',
      'username',
      'email',
      'followers',
      'accountStatus',
      'trustScore',
      'riskLevel',
      'recommendedAction',
      'growthScore',
      'followsLastWindow',
      'followsPrevWindow',
      'followsDelta',
      'publishedLastWindow',
      'publishedPrevWindow',
      'publishedDelta',
      'engagementScore',
      'views',
      'likes',
      'favorites',
      'comments',
      'ratingsCount',
      'averageRating',
      'actionsTotal',
      'actionsPerPublished',
      'contentTotal',
      'contentPublished',
      'premiumPublished',
      'featuredPublished',
      'windowDays',
    ]

    const csvLines = [headers.join(',')]
    for (const row of limitedRows) {
      const values = [
        row.creator.id,
        row.creator.name,
        row.creator.username,
        row.creator.email,
        row.creator.followers,
        row.creator.accountStatus,
        row.trust.trustScore,
        row.trust.riskLevel,
        row.trust.recommendedAction,
        row.growth.score,
        row.growth.followsLastWindow,
        row.growth.followsPrevWindow,
        row.growth.followsDelta,
        row.growth.publishedLastWindow,
        row.growth.publishedPrevWindow,
        row.growth.publishedDelta,
        row.engagement.score,
        row.engagement.views,
        row.engagement.likes,
        row.engagement.favorites,
        row.engagement.comments,
        row.engagement.ratingsCount,
        row.engagement.averageRating,
        row.engagement.actionsTotal,
        row.engagement.actionsPerPublished,
        row.content.total,
        row.content.published,
        row.content.premiumPublished,
        row.content.featuredPublished,
        row.growth.windowDays,
      ]

      csvLines.push(values.map((value) => escapeCsv(toCsvSafeValue(value))).join(','))
    }

    return {
      csv: csvLines.join('\n'),
      rowsExported: limitedRows.length,
      sortBy,
      sortOrder,
      windowDays,
    }
  }

  private resolveSortBy(value: unknown): SortBy {
    if (value === 'growth' || value === 'engagement' || value === 'followers' || value === 'trust') {
      return value
    }
    return 'growth'
  }

  private resolveSortOrder(value: unknown): SortOrder {
    if (value === 'asc' || value === 'desc') return value
    return 'desc'
  }

  private async buildRows(params: BuildRowsParams): Promise<CreatorAnalyticsInternal[]> {
    const search = toStringOrNull(params.filters?.search)
    const accountStatus = params.filters?.accountStatus
    const riskLevel = params.filters?.riskLevel

    const creatorQuery: Record<string, unknown> = {
      role: 'creator',
    }

    if (accountStatus === 'active' || accountStatus === 'suspended' || accountStatus === 'banned') {
      creatorQuery.accountStatus = accountStatus
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      creatorQuery.$or = [{ name: regex }, { username: regex }, { email: regex }]
    }

    const creators = await User.find(creatorQuery)
      .select('name username email avatar accountStatus followers following createdAt lastActiveAt')
      .sort({ followers: -1, createdAt: -1 })
      .limit(2000)
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId
          name?: string
          username?: string
          email?: string
          avatar?: string | null
          accountStatus?: UserAccountStatus
          followers?: number
          following?: number
          createdAt?: Date
          lastActiveAt?: Date | null
        }>
      >()

    if (creators.length === 0) return []

    const creatorIds = creators
      .map((item) => item._id)
      .filter((item): item is mongoose.Types.ObjectId => item instanceof mongoose.Types.ObjectId)

    const now = new Date()
    const windowStart = new Date(now.getTime() - params.windowDays * DAY_MS)
    const prevWindowStart = new Date(now.getTime() - params.windowDays * 2 * DAY_MS)

    const followRows = await Follow.aggregate<FollowAggregateRow>([
      {
        $match: {
          following: { $in: creatorIds },
          createdAt: { $gte: prevWindowStart, $lt: now },
        },
      },
      {
        $group: {
          _id: '$following',
          followsLastWindow: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', windowStart] }, 1, 0],
            },
          },
          followsPrevWindow: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', prevWindowStart] },
                    { $lt: ['$createdAt', windowStart] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])

    const followMap = new Map<string, FollowAggregateRow>()
    for (const row of followRows) {
      followMap.set(String(row._id), row)
    }

    const contentMap = new Map<
      string,
      {
        total: number
        published: number
        premiumPublished: number
        featuredPublished: number
        views: number
        likes: number
        favorites: number
        comments: number
        ratingsCount: number
        ratingWeighted: number
        publishedLastWindow: number
        publishedPrevWindow: number
        byType: Record<ContentKey, { total: number; published: number }>
      }
    >()

    for (const creator of creators) {
      contentMap.set(String(creator._id), {
        total: 0,
        published: 0,
        premiumPublished: 0,
        featuredPublished: 0,
        views: 0,
        likes: 0,
        favorites: 0,
        comments: 0,
        ratingsCount: 0,
        ratingWeighted: 0,
        publishedLastWindow: 0,
        publishedPrevWindow: 0,
        byType: {
          article: { total: 0, published: 0 },
          video: { total: 0, published: 0 },
          course: { total: 0, published: 0 },
          live: { total: 0, published: 0 },
          podcast: { total: 0, published: 0 },
          book: { total: 0, published: 0 },
        },
      })
    }

    await Promise.all(
      CONTENT_MODELS.map(async ({ key, model }) => {
        const rows = await model.aggregate<ContentAggregateRow>([
          {
            $match: {
              creator: { $in: creatorIds },
            },
          },
          {
            $project: {
              creator: 1,
              status: 1,
              isPremium: 1,
              isFeatured: 1,
              views: { $ifNull: ['$views', 0] },
              likes: { $ifNull: ['$likes', 0] },
              favorites: { $ifNull: ['$favorites', 0] },
              commentsCount: { $ifNull: ['$commentsCount', 0] },
              ratingsCount: { $ifNull: ['$ratingsCount', 0] },
              averageRating: { $ifNull: ['$averageRating', 0] },
              activityAt: { $ifNull: ['$publishedAt', '$createdAt'] },
            },
          },
          {
            $group: {
              _id: '$creator',
              totalContent: { $sum: 1 },
              publishedContent: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'published'] }, 1, 0],
                },
              },
              premiumPublished: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $eq: ['$status', 'published'] }, { $eq: ['$isPremium', true] }],
                    },
                    1,
                    0,
                  ],
                },
              },
              featuredPublished: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $eq: ['$status', 'published'] }, { $eq: ['$isFeatured', true] }],
                    },
                    1,
                    0,
                  ],
                },
              },
              views: { $sum: '$views' },
              likes: { $sum: '$likes' },
              favorites: { $sum: '$favorites' },
              comments: { $sum: '$commentsCount' },
              ratingsCount: { $sum: '$ratingsCount' },
              ratingWeighted: {
                $sum: {
                  $multiply: ['$averageRating', '$ratingsCount'],
                },
              },
              publishedLastWindow: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$status', 'published'] },
                        { $gte: ['$activityAt', windowStart] },
                        { $lt: ['$activityAt', now] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              publishedPrevWindow: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$status', 'published'] },
                        { $gte: ['$activityAt', prevWindowStart] },
                        { $lt: ['$activityAt', windowStart] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])

        for (const row of rows) {
          const creatorId = String(row._id)
          const accumulator = contentMap.get(creatorId)
          if (!accumulator) continue

          accumulator.total += row.totalContent
          accumulator.published += row.publishedContent
          accumulator.premiumPublished += row.premiumPublished
          accumulator.featuredPublished += row.featuredPublished
          accumulator.views += row.views
          accumulator.likes += row.likes
          accumulator.favorites += row.favorites
          accumulator.comments += row.comments
          accumulator.ratingsCount += row.ratingsCount
          accumulator.ratingWeighted += row.ratingWeighted
          accumulator.publishedLastWindow += row.publishedLastWindow
          accumulator.publishedPrevWindow += row.publishedPrevWindow
          accumulator.byType[key] = {
            total: row.totalContent,
            published: row.publishedContent,
          }
        }
      })
    )

    const trustMap = await creatorTrustService.getSignalsForCreators(
      creators.map((item) => String(item._id))
    )

    const rows: CreatorAnalyticsInternal[] = []
    for (const creator of creators) {
      const creatorId = String(creator._id)
      const content = contentMap.get(creatorId)
      if (!content) continue

      const follows = followMap.get(creatorId)
      const followsLastWindow = follows?.followsLastWindow ?? 0
      const followsPrevWindow = follows?.followsPrevWindow ?? 0
      const followsDelta = followsLastWindow - followsPrevWindow
      const followsTrendPercent =
        followsPrevWindow > 0 ? round((followsDelta / followsPrevWindow) * 100, 2) : followsLastWindow > 0 ? 100 : 0

      const publishedDelta = content.publishedLastWindow - content.publishedPrevWindow
      const actionsTotal = content.likes + content.favorites + content.comments
      const averageRating =
        content.ratingsCount > 0 ? round(content.ratingWeighted / content.ratingsCount, 2) : 0
      const actionsPerPublished =
        content.published > 0 ? round(actionsTotal / content.published, 2) : 0

      const growthScore = round(
        Math.max(0, followsLastWindow) * 4 +
          Math.max(0, followsDelta) * 2 +
          Math.max(0, publishedDelta) * 3 +
          content.premiumPublished * 0.5 +
          content.featuredPublished * 0.5,
        2
      )

      const engagementScore = round(
        content.views / 1000 + actionsTotal / 5 + averageRating * 2 + content.ratingsCount / 20,
        2
      )

      const trust = trustMap.get(creatorId)
      const trustSummary = trust?.summary

      const row: CreatorAnalyticsInternal = {
        creatorId,
        creator: {
          id: creatorId,
          name: creator.name ?? '',
          username: creator.username ?? '',
          email: creator.email ?? '',
          avatar: creator.avatar ?? null,
          accountStatus: creator.accountStatus ?? 'active',
          followers: Number(creator.followers ?? 0),
          following: Number(creator.following ?? 0),
          createdAt: creator.createdAt ? creator.createdAt.toISOString() : null,
          lastActiveAt: creator.lastActiveAt ? creator.lastActiveAt.toISOString() : null,
        },
        content: {
          total: content.total,
          published: content.published,
          premiumPublished: content.premiumPublished,
          featuredPublished: content.featuredPublished,
          byType: content.byType,
        },
        growth: {
          windowDays: params.windowDays,
          followsLastWindow,
          followsPrevWindow,
          followsDelta,
          followsTrendPercent,
          publishedLastWindow: content.publishedLastWindow,
          publishedPrevWindow: content.publishedPrevWindow,
          publishedDelta,
          score: growthScore,
        },
        engagement: {
          views: content.views,
          likes: content.likes,
          favorites: content.favorites,
          comments: content.comments,
          ratingsCount: content.ratingsCount,
          averageRating,
          actionsTotal,
          actionsPerPublished,
          score: engagementScore,
        },
        trust: {
          trustScore: trust?.trustScore ?? 100,
          riskLevel: trust?.riskLevel ?? 'low',
          recommendedAction: trust?.recommendedAction ?? 'none',
          openReports: trustSummary?.openReports ?? 0,
          highPriorityTargets: trustSummary?.highPriorityTargets ?? 0,
          criticalTargets: trustSummary?.criticalTargets ?? 0,
          falsePositiveRate30d: trustSummary?.falsePositiveRate30d ?? 0,
        },
      }

      if (riskLevel && row.trust.riskLevel !== riskLevel) {
        continue
      }

      rows.push(row)
    }

    sortRows(rows, params.sortBy, params.sortOrder)
    return rows
  }
}

export const adminCreatorAnalyticsService = new AdminCreatorAnalyticsService()
