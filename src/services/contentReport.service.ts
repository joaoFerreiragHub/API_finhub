import mongoose from 'mongoose'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Comment } from '../models/Comment'
import { ContentReport, ContentReportReason, ContentReportStatus } from '../models/ContentReport'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { ContentModerationAction, ModeratableContentType } from '../models/ContentModerationEvent'
import { Podcast } from '../models/Podcast'
import { Rating } from '../models/Rating'
import { Video } from '../models/Video'

interface ContentModel {
  findById(id: string): any
}

interface ReportTargetSnapshot {
  ownerUserId: string | null
  moderationStatus: string | null
}

const BASE_CONTENT_TYPES: ModeratableContentType[] = [
  'article',
  'video',
  'course',
  'live',
  'podcast',
  'book',
]
const CONTENT_TYPES: ModeratableContentType[] = [...BASE_CONTENT_TYPES, 'comment', 'review']
const REPORT_REASONS: ContentReportReason[] = [
  'spam',
  'abuse',
  'misinformation',
  'sexual',
  'violence',
  'hate',
  'scam',
  'copyright',
  'other',
]
const REPORT_STATUSES: ContentReportStatus[] = ['open', 'reviewed', 'dismissed']

const contentModelByType: Record<ModeratableContentType, ContentModel> = {
  article: Article as unknown as ContentModel,
  video: Video as unknown as ContentModel,
  course: Course as unknown as ContentModel,
  live: LiveEvent as unknown as ContentModel,
  podcast: Podcast as unknown as ContentModel,
  book: Book as unknown as ContentModel,
  comment: Comment as unknown as ContentModel,
  review: Rating as unknown as ContentModel,
}

const REPORT_REASON_WEIGHTS: Record<ContentReportReason, number> = {
  scam: 5,
  sexual: 4,
  violence: 4,
  hate: 4,
  misinformation: 3,
  copyright: 3,
  abuse: 3,
  spam: 2,
  other: 1,
}

export type ContentReportPriority = 'none' | 'low' | 'medium' | 'high' | 'critical'

export interface CreateContentReportInput {
  reporterId: string
  contentType: ModeratableContentType
  contentId: string
  reason: ContentReportReason
  note?: string
}

export interface ReportSummaryTarget {
  contentType: ModeratableContentType
  contentId: string
}

export interface ReportSignalSummary {
  openReports: number
  uniqueReporters: number
  latestReportAt: Date | null
  topReasons: Array<{ reason: ContentReportReason; count: number }>
  priorityScore: number
  priority: ContentReportPriority
}

export interface BuildReportSignalSummaryInput {
  openReports: number
  uniqueReporters: number
  latestReportAt: Date | null
  reasons: ContentReportReason[]
}

export interface ListContentReportsFilters {
  contentType: ModeratableContentType
  contentId: string
  status?: ContentReportStatus
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export class ContentReportServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

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
    throw new ContentReportServiceError(400, `${fieldName} invalido.`)
  }

  return new mongoose.Types.ObjectId(rawId)
}

export const isValidReportedContentType = (value: unknown): value is ModeratableContentType =>
  typeof value === 'string' && CONTENT_TYPES.includes(value as ModeratableContentType)

export const isValidContentReportReason = (value: unknown): value is ContentReportReason =>
  typeof value === 'string' && REPORT_REASONS.includes(value as ContentReportReason)

export const isValidContentReportStatus = (value: unknown): value is ContentReportStatus =>
  typeof value === 'string' && REPORT_STATUSES.includes(value as ContentReportStatus)

export const isValidContentReportPriority = (value: unknown): value is ContentReportPriority =>
  value === 'none' || value === 'low' || value === 'medium' || value === 'high' || value === 'critical'

const createEmptySummary = (): ReportSignalSummary => ({
  openReports: 0,
  uniqueReporters: 0,
  latestReportAt: null,
  topReasons: [],
  priorityScore: 0,
  priority: 'none',
})

const mapPriority = (score: number): ContentReportPriority => {
  if (score >= 12) return 'critical'
  if (score >= 8) return 'high'
  if (score >= 4) return 'medium'
  if (score >= 1) return 'low'
  return 'none'
}

const toPriorityRank = (priority: ContentReportPriority): number => {
  if (priority === 'critical') return 4
  if (priority === 'high') return 3
  if (priority === 'medium') return 2
  if (priority === 'low') return 1
  return 0
}

export const isPriorityAtLeast = (
  current: ContentReportPriority,
  minimum: ContentReportPriority
): boolean => toPriorityRank(current) >= toPriorityRank(minimum)

export const buildReportSignalSummary = (
  input: BuildReportSignalSummaryInput
): ReportSignalSummary => {
  const reasonCounts = new Map<ContentReportReason, number>()
  for (const reason of input.reasons) {
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1)
  }

  const topReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.reason.localeCompare(b.reason)
    })
    .slice(0, 3)

  const highestReasonWeight = topReasons.reduce((max, item) => {
    return Math.max(max, REPORT_REASON_WEIGHTS[item.reason] ?? 0)
  }, 0)

  const openReports = input.openReports
  const uniqueReporters = input.uniqueReporters
  const priorityScore = openReports + uniqueReporters + highestReasonWeight

  return {
    openReports,
    uniqueReporters,
    latestReportAt: input.latestReportAt,
    topReasons,
    priorityScore,
    priority: mapPriority(priorityScore),
  }
}

const buildSummaryFromAggregate = (aggregate: {
  openReports: number
  uniqueReporterIds: mongoose.Types.ObjectId[]
  latestReportAt: Date | null
  reasons: ContentReportReason[]
}): ReportSignalSummary =>
  buildReportSignalSummary({
    openReports: aggregate.openReports,
    uniqueReporters: aggregate.uniqueReporterIds.length,
    latestReportAt: aggregate.latestReportAt,
    reasons: aggregate.reasons,
  })

export class ContentReportService {
  async createOrUpdateReport(input: CreateContentReportInput) {
    const reporterId = toObjectId(input.reporterId, 'reporterId')
    toObjectId(input.contentId, 'contentId')

    if (!isValidReportedContentType(input.contentType)) {
      throw new ContentReportServiceError(400, 'contentType invalido.')
    }

    if (!isValidContentReportReason(input.reason)) {
      throw new ContentReportServiceError(400, 'reason invalido.')
    }

    const target = await this.getTargetSnapshot(input.contentType, input.contentId)
    if (!target) {
      throw new ContentReportServiceError(404, 'Conteudo alvo nao encontrado.')
    }

    if (target.ownerUserId && String(target.ownerUserId) === String(reporterId)) {
      throw new ContentReportServiceError(409, 'Nao e permitido reportar o proprio conteudo.')
    }

    const note = input.note?.trim() ? input.note.trim() : null
    const existing = await ContentReport.findOne({
      reporter: reporterId,
      contentType: input.contentType,
      contentId: input.contentId,
    })

    if (existing) {
      existing.reason = input.reason
      existing.note = note ?? undefined
      existing.status = 'open'
      existing.set('reviewedBy', null)
      existing.set('reviewedAt', null)
      existing.set('resolutionAction', null)
      await existing.save()

      return {
        created: false,
        report: this.mapReport(existing.toObject()),
      }
    }

    const created = await ContentReport.create({
      reporter: reporterId,
      contentType: input.contentType,
      contentId: input.contentId,
      reason: input.reason,
      note,
      status: 'open',
    })

    return {
      created: true,
      report: this.mapReport(created.toObject()),
    }
  }

  async listReportsForContent(filters: ListContentReportsFilters, options: PaginationOptions = {}) {
    if (!isValidReportedContentType(filters.contentType)) {
      throw new ContentReportServiceError(400, 'contentType invalido.')
    }

    toObjectId(filters.contentId, 'contentId')

    if (filters.status && !isValidContentReportStatus(filters.status)) {
      throw new ContentReportServiceError(400, 'status invalido.')
    }

    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = {
      contentType: filters.contentType,
      contentId: filters.contentId,
    }

    if (filters.status) {
      query.status = filters.status
    }

    const [items, total] = await Promise.all([
      ContentReport.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporter', 'name username email role')
        .populate('reviewedBy', 'name username email role')
        .lean(),
      ContentReport.countDocuments(query),
    ])

    return {
      items: items.map((item: any) => this.mapReport(item)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getOpenReportSummaries(targets: ReportSummaryTarget[]) {
    const dedupedTargets = Array.from(
      new Map(targets.map((target) => [`${target.contentType}:${target.contentId}`, target])).values()
    )

    if (dedupedTargets.length === 0) {
      return new Map<string, ReportSignalSummary>()
    }

    for (const target of dedupedTargets) {
      if (!isValidReportedContentType(target.contentType)) {
        throw new ContentReportServiceError(400, 'contentType invalido.')
      }

      toObjectId(target.contentId, 'contentId')
    }

    const grouped = await ContentReport.aggregate<{
      _id: { contentType: ModeratableContentType; contentId: string }
      openReports: number
      uniqueReporterIds: mongoose.Types.ObjectId[]
      latestReportAt: Date | null
      reasons: ContentReportReason[]
    }>([
      {
        $match: {
          status: 'open',
          $or: dedupedTargets.map((target) => ({
            contentType: target.contentType,
            contentId: target.contentId,
          })),
        },
      },
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
    ])

    const summaryMap = new Map<string, ReportSignalSummary>()

    for (const item of grouped) {
      summaryMap.set(
        `${item._id.contentType}:${item._id.contentId}`,
        buildSummaryFromAggregate({
          openReports: item.openReports,
          uniqueReporterIds: item.uniqueReporterIds,
          latestReportAt: item.latestReportAt,
          reasons: item.reasons,
        })
      )
    }

    return summaryMap
  }

  async resolveOpenReportsForContent(input: {
    contentType: ModeratableContentType
    contentId: string
    reviewedBy: string
    resolutionAction: ContentModerationAction
  }) {
    if (!isValidReportedContentType(input.contentType)) {
      throw new ContentReportServiceError(400, 'contentType invalido.')
    }

    toObjectId(input.contentId, 'contentId')
    const reviewedBy = toObjectId(input.reviewedBy, 'reviewedBy')
    const reviewedAt = new Date()

    const result = await ContentReport.updateMany(
      {
        contentType: input.contentType,
        contentId: input.contentId,
        status: 'open',
      },
      {
        $set: {
          status: 'reviewed',
          reviewedBy,
          reviewedAt,
          resolutionAction: input.resolutionAction,
        },
      }
    )

    return result.modifiedCount ?? 0
  }

  getEmptySummary(): ReportSignalSummary {
    return createEmptySummary()
  }

  private async getTargetSnapshot(
    contentType: ModeratableContentType,
    contentId: string
  ): Promise<ReportTargetSnapshot | null> {
    const model = contentModelByType[contentType]
    if (!model) {
      throw new ContentReportServiceError(400, 'contentType invalido.')
    }

    if (BASE_CONTENT_TYPES.includes(contentType)) {
      const item = await model.findById(contentId).select('creator moderationStatus').lean()
      return item
        ? {
            ownerUserId: item.creator ? String(item.creator) : null,
            moderationStatus: item.moderationStatus ? String(item.moderationStatus) : null,
          }
        : null
    }

    if (contentType === 'comment') {
      const item = await model.findById(contentId).select('user moderationStatus').lean()
      return item
        ? {
            ownerUserId: item.user ? String(item.user) : null,
            moderationStatus: item.moderationStatus ? String(item.moderationStatus) : null,
          }
        : null
    }

    const item = await model.findById(contentId).select('user moderationStatus').lean()
    return item
      ? {
          ownerUserId: item.user ? String(item.user) : null,
          moderationStatus: item.moderationStatus ? String(item.moderationStatus) : null,
        }
      : null
  }

  private mapReport(item: any) {
    return {
      id: String(item._id),
      reporter: item.reporter ?? null,
      contentType: item.contentType,
      contentId: item.contentId,
      reason: item.reason,
      note: item.note ?? null,
      status: item.status,
      reviewedBy: item.reviewedBy ?? null,
      reviewedAt: item.reviewedAt ?? null,
      resolutionAction: item.resolutionAction ?? null,
      createdAt: item.createdAt ?? null,
      updatedAt: item.updatedAt ?? null,
    }
  }
}

export const contentReportService = new ContentReportService()
