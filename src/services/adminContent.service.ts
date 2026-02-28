import mongoose from 'mongoose'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import {
  ContentModerationAction,
  ContentModerationEvent,
  ModeratableContentType,
} from '../models/ContentModerationEvent'
import { ContentModerationStatus, ContentType, PublishStatus } from '../models/BaseContent'
import { Comment } from '../models/Comment'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Rating } from '../models/Rating'
import { Video } from '../models/Video'
import {
  contentReportService,
  ContentReportPriority,
  isPriorityAtLeast,
} from './contentReport.service'

interface ContentModel {
  find(query: Record<string, unknown>): any
  findById(id: string): any
  countDocuments(query: Record<string, unknown>): Promise<number>
}

const BASE_CONTENT_TYPES: ContentType[] = ['article', 'video', 'course', 'live', 'podcast', 'book']
const CONTENT_TYPES: ModeratableContentType[] = [...BASE_CONTENT_TYPES, 'comment', 'review']
const MODERATION_STATUSES: ContentModerationStatus[] = ['visible', 'hidden', 'restricted']
const PUBLISH_STATUSES: PublishStatus[] = ['draft', 'published', 'archived']

const contentModelByType: Record<ContentType, ContentModel> = {
  article: Article as unknown as ContentModel,
  video: Video as unknown as ContentModel,
  course: Course as unknown as ContentModel,
  live: LiveEvent as unknown as ContentModel,
  podcast: Podcast as unknown as ContentModel,
  book: Book as unknown as ContentModel,
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
export const ADMIN_CONTENT_BULK_MAX_ITEMS = 50
export const ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD = 10
export const ADMIN_CONTENT_FAST_HIDE_REASON =
  'Ocultacao rapida preventiva para protecao da plataforma.'

export interface AdminContentQueueFilters {
  contentType?: ModeratableContentType
  moderationStatus?: ContentModerationStatus
  publishStatus?: PublishStatus
  creatorId?: string
  search?: string
  flaggedOnly?: boolean
  minReportPriority?: ContentReportPriority
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface ModerateContentInput {
  actorId: string
  contentType: ModeratableContentType
  contentId: string
  action: ContentModerationAction
  reason: string
  note?: string
  metadata?: Record<string, unknown>
}

export interface FastHideContentInput {
  actorId: string
  contentType: ModeratableContentType
  contentId: string
  note?: string
  reason?: string
}

export interface BulkModerateContentItem {
  contentType: ModeratableContentType
  contentId: string
}

export interface BulkModerateContentInput {
  actorId: string
  action: ContentModerationAction
  reason: string
  note?: string
  confirm?: boolean
  items: BulkModerateContentItem[]
}

export interface BulkModerateContentResultItem {
  contentType: ModeratableContentType
  contentId: string
  success: boolean
  changed?: boolean
  fromStatus?: ContentModerationStatus
  toStatus?: ContentModerationStatus
  content?: unknown
  error?: string
  statusCode?: number
}

export interface ContentHistoryFilters {
  contentType: ModeratableContentType
  contentId: string
}

export class AdminContentServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

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
    throw new AdminContentServiceError(400, `${fieldName} invalido.`)
  }

  return new mongoose.Types.ObjectId(rawId)
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toModerationStatus = (value: unknown): ContentModerationStatus => {
  if (value === 'hidden') return 'hidden'
  if (value === 'restricted') return 'restricted'
  return 'visible'
}

const toPublishStatus = (value: unknown): PublishStatus => {
  if (value === 'draft') return 'draft'
  if (value === 'archived') return 'archived'
  return 'published'
}

const isValidContentType = (value: unknown): value is ModeratableContentType =>
  typeof value === 'string' && CONTENT_TYPES.includes(value as ModeratableContentType)

const isBaseContentType = (value: ModeratableContentType): value is ContentType =>
  BASE_CONTENT_TYPES.includes(value as ContentType)

const toExcerpt = (text: unknown, maxLength = 96): string => {
  const raw = typeof text === 'string' ? text.trim() : ''
  if (!raw) return ''
  if (raw.length <= maxLength) return raw
  return `${raw.slice(0, maxLength - 3)}...`
}

const publishedOnlyQuery = { _id: { $exists: false } }

export const isValidModerationStatus = (value: unknown): value is ContentModerationStatus =>
  typeof value === 'string' && MODERATION_STATUSES.includes(value as ContentModerationStatus)

export const isValidPublishStatus = (value: unknown): value is PublishStatus =>
  typeof value === 'string' && PUBLISH_STATUSES.includes(value as PublishStatus)

export const isValidContentTypeFilter = (value: unknown): value is ModeratableContentType =>
  isValidContentType(value)

export class AdminContentService {
  async listQueue(filters: AdminContentQueueFilters = {}, options: PaginationOptions = {}) {
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit

    if (filters.contentType && !isValidContentType(filters.contentType)) {
      throw new AdminContentServiceError(400, 'contentType invalido.')
    }

    if (filters.moderationStatus && !isValidModerationStatus(filters.moderationStatus)) {
      throw new AdminContentServiceError(400, 'moderationStatus invalido.')
    }

    if (filters.publishStatus && !isValidPublishStatus(filters.publishStatus)) {
      throw new AdminContentServiceError(400, 'publishStatus invalido.')
    }

    if (filters.creatorId) {
      toObjectId(filters.creatorId, 'creatorId')
    }

    const types = filters.contentType ? [filters.contentType] : CONTENT_TYPES

    const listResults = await Promise.all(
      types.map(async (contentType) => this.listQueueByType(contentType, filters))
    )

    const mergedItems = listResults
      .flatMap((result) => result.items)
    const enrichedItems = await this.attachReportSignals(mergedItems)
    const filteredItems = enrichedItems
      .filter((item) => {
        if (filters.flaggedOnly && item.reportSignals.openReports <= 0) {
          return false
        }

        if (
          filters.minReportPriority &&
          !isPriorityAtLeast(item.reportSignals.priority, filters.minReportPriority)
        ) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        if (b.reportSignals.priorityScore !== a.reportSignals.priorityScore) {
          return b.reportSignals.priorityScore - a.reportSignals.priorityScore
        }

        const aReportDate = this.toSortableDate(a.reportSignals.latestReportAt)
        const bReportDate = this.toSortableDate(b.reportSignals.latestReportAt)
        if (bReportDate !== aReportDate) {
          return bReportDate - aReportDate
        }

        return this.toSortableDate(b.updatedAt) - this.toSortableDate(a.updatedAt)
      })

    const total = filteredItems.length
    const paginatedItems = filteredItems.slice(skip, skip + limit)

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async moderateContent(input: ModerateContentInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    toObjectId(input.contentId, 'contentId')
    const model = this.getModel(input.contentType)
    const content = (await model.findById(input.contentId)) as any

    if (!content) {
      throw new AdminContentServiceError(404, 'Conteudo alvo nao encontrado.')
    }

    const fromStatus = toModerationStatus(content.moderationStatus)
    const toStatus = this.mapActionToStatus(input.action)
    const now = new Date()
    const note = input.note?.trim() ? input.note.trim() : null
    const reason = input.reason.trim()
    const changed =
      fromStatus !== toStatus ||
      String(content.moderationReason ?? '') !== reason ||
      String(content.moderationNote ?? '') !== String(note ?? '')

    content.moderationStatus = toStatus
    content.moderationReason = reason
    content.moderationNote = note
    content.moderatedBy = actorId
    content.moderatedAt = now

    await content.save()
    const resolvedOpenReports = await contentReportService.resolveOpenReportsForContent({
      contentType: input.contentType,
      contentId: String(content._id),
      reviewedBy: input.actorId,
      resolutionAction: input.action,
    })

    const baseMetadata =
      input.contentType === 'comment'
        ? {
            changed,
            publishStatus: 'published',
            targetType: String(content.targetType ?? ''),
            targetId: String(content.targetId ?? ''),
            parentComment: content.parentComment ? String(content.parentComment) : null,
          }
        : input.contentType === 'review'
          ? {
              changed,
              publishStatus: 'published',
              targetType: String(content.targetType ?? ''),
              targetId: String(content.targetId ?? ''),
              rating: typeof content.rating === 'number' ? content.rating : null,
            }
          : {
              changed,
              publishStatus: toPublishStatus(content.status),
            }

    const metadata = input.metadata
      ? { ...baseMetadata, resolvedOpenReports, ...input.metadata }
      : { ...baseMetadata, resolvedOpenReports }

    await ContentModerationEvent.create({
      contentType: input.contentType,
      contentId: String(content._id),
      actor: actorId,
      action: input.action,
      fromStatus,
      toStatus,
      reason,
      note,
      metadata,
    })

    const queueItem = await this.getQueueItemById(input.contentType, String(content._id))
    if (!queueItem) {
      throw new AdminContentServiceError(500, 'Erro ao carregar conteudo apos moderacao.')
    }

    return {
      changed,
      fromStatus,
      toStatus,
      content: queueItem,
    }
  }

  async fastHideContent(input: FastHideContentInput) {
    const reason = input.reason?.trim() || ADMIN_CONTENT_FAST_HIDE_REASON

    return this.moderateContent({
      actorId: input.actorId,
      contentType: input.contentType,
      contentId: input.contentId,
      action: 'hide',
      reason,
      note: input.note,
      metadata: {
        fastTrack: true,
      },
    })
  }

  async bulkModerateContent(input: BulkModerateContentInput) {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new AdminContentServiceError(400, 'Pelo menos um item e obrigatorio para moderacao em lote.')
    }

    if (input.items.length > ADMIN_CONTENT_BULK_MAX_ITEMS) {
      throw new AdminContentServiceError(
        400,
        `Lote excede o limite maximo de ${ADMIN_CONTENT_BULK_MAX_ITEMS} itens.`
      )
    }

    const normalizedItems = input.items.map((item, index) => {
      if (!isValidContentType(item.contentType)) {
        throw new AdminContentServiceError(400, `items[${index}].contentType invalido.`)
      }

      toObjectId(item.contentId, `items[${index}].contentId`)

      return {
        contentType: item.contentType,
        contentId: item.contentId,
      }
    })

    const dedupeMap = new Map<string, BulkModerateContentItem>()
    for (const item of normalizedItems) {
      const itemKey = `${item.contentType}:${item.contentId}`
      if (!dedupeMap.has(itemKey)) {
        dedupeMap.set(itemKey, item)
      }
    }

    const uniqueItems = Array.from(dedupeMap.values())
    const duplicatesSkipped = normalizedItems.length - uniqueItems.length

    if (uniqueItems.length >= ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD && input.confirm !== true) {
      throw new AdminContentServiceError(
        400,
        `Lotes com ${ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD} ou mais itens exigem confirm=true.`
      )
    }

    const results: BulkModerateContentResultItem[] = []

    for (const item of uniqueItems) {
      try {
        const result = await this.moderateContent({
          actorId: input.actorId,
          contentType: item.contentType,
          contentId: item.contentId,
          action: input.action,
          reason: input.reason,
          note: input.note,
          metadata: {
            bulkModeration: true,
            bulkSize: uniqueItems.length,
          },
        })

        results.push({
          contentType: item.contentType,
          contentId: item.contentId,
          success: true,
          changed: result.changed,
          fromStatus: result.fromStatus,
          toStatus: result.toStatus,
          content: result.content,
        })
      } catch (error: unknown) {
        if (error instanceof AdminContentServiceError) {
          results.push({
            contentType: item.contentType,
            contentId: item.contentId,
            success: false,
            error: error.message,
            statusCode: error.statusCode,
          })
          continue
        }

        throw error
      }
    }

    const succeeded = results.filter((item) => item.success).length
    const failed = results.length - succeeded
    const changed = results.filter((item) => item.success && item.changed).length

    return {
      items: results,
      summary: {
        requested: input.items.length,
        processed: uniqueItems.length,
        succeeded,
        failed,
        changed,
      },
      guardrails: {
        maxItems: ADMIN_CONTENT_BULK_MAX_ITEMS,
        confirmThreshold: ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD,
        confirmApplied:
          uniqueItems.length < ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD ? true : input.confirm === true,
        duplicatesSkipped,
      },
    }
  }

  async listHistory(filters: ContentHistoryFilters, options: PaginationOptions = {}) {
    if (!isValidContentType(filters.contentType)) {
      throw new AdminContentServiceError(400, 'contentType invalido.')
    }

    toObjectId(filters.contentId, 'contentId')
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit

    const query = {
      contentType: filters.contentType,
      contentId: filters.contentId,
    }

    const [items, total] = await Promise.all([
      ContentModerationEvent.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name username email role')
        .lean(),
      ContentModerationEvent.countDocuments(query),
    ])

    return {
      items: items.map((item: any) => ({
        id: String(item._id),
        contentType: item.contentType,
        contentId: item.contentId,
        actor: item.actor,
        action: item.action,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        reason: item.reason,
        note: item.note ?? null,
        metadata: item.metadata ?? null,
        createdAt: item.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  private async listQueueByType(
    contentType: ModeratableContentType,
    filters: AdminContentQueueFilters
  ): Promise<{ total: number; items: any[] }> {
    if (isBaseContentType(contentType)) {
      return this.listBaseQueue(contentType, filters)
    }

    if (contentType === 'comment') {
      return this.listCommentQueue(filters)
    }

    return this.listReviewQueue(filters)
  }

  private async listBaseQueue(contentType: ContentType, filters: AdminContentQueueFilters) {
    const model = this.getModel(contentType)
    const query = this.buildBaseQueueQuery(filters)

    const [items, total] = await Promise.all([
      model
        .find(query)
        .select(
          'title slug description category status moderationStatus moderationReason moderationNote moderatedBy moderatedAt creator createdAt updatedAt contentType'
        )
        .sort({ updatedAt: -1 })
        .populate('creator', 'name username email role')
        .populate('moderatedBy', 'name username email role')
        .lean(),
      model.countDocuments(query),
    ])

    return {
      total,
      items: (items as any[]).map((item) => this.mapBaseQueueItem(contentType, item)),
    }
  }

  private async listCommentQueue(filters: AdminContentQueueFilters) {
    const query = this.buildCommentQueueQuery(filters)

    const [items, total] = await Promise.all([
      Comment.find(query)
        .select(
          'content targetType targetId parentComment moderationStatus moderationReason moderationNote moderatedBy moderatedAt user createdAt updatedAt'
        )
        .sort({ updatedAt: -1 })
        .populate('user', 'name username email role')
        .populate('moderatedBy', 'name username email role')
        .lean(),
      Comment.countDocuments(query),
    ])

    return {
      total,
      items: (items as any[]).map((item) => this.mapCommentQueueItem(item)),
    }
  }

  private async listReviewQueue(filters: AdminContentQueueFilters) {
    const query = this.buildReviewQueueQuery(filters)

    const [items, total] = await Promise.all([
      Rating.find(query)
        .select(
          'rating review targetType targetId moderationStatus moderationReason moderationNote moderatedBy moderatedAt user createdAt updatedAt'
        )
        .sort({ updatedAt: -1 })
        .populate('user', 'name username email role')
        .populate('moderatedBy', 'name username email role')
        .lean(),
      Rating.countDocuments(query),
    ])

    return {
      total,
      items: (items as any[]).map((item) => this.mapReviewQueueItem(item)),
    }
  }

  private async getQueueItemById(contentType: ModeratableContentType, contentId: string) {
    if (isBaseContentType(contentType)) {
      const model = this.getModel(contentType)
      const item = await model
        .findById(contentId)
        .select(
          'title slug description category status moderationStatus moderationReason moderationNote moderatedBy moderatedAt creator createdAt updatedAt contentType'
        )
        .populate('creator', 'name username email role')
        .populate('moderatedBy', 'name username email role')
        .lean()

      if (!item) return null
      const [queueItem] = await this.attachReportSignals([this.mapBaseQueueItem(contentType, item)])
      return queueItem ?? null
    }

    if (contentType === 'comment') {
      const item = await Comment.findById(contentId)
        .select(
          'content targetType targetId parentComment moderationStatus moderationReason moderationNote moderatedBy moderatedAt user createdAt updatedAt'
        )
        .populate('user', 'name username email role')
        .populate('moderatedBy', 'name username email role')
        .lean()

      if (!item) return null
      const [queueItem] = await this.attachReportSignals([this.mapCommentQueueItem(item as any)])
      return queueItem ?? null
    }

    const item = await Rating.findById(contentId)
      .select(
        'rating review targetType targetId moderationStatus moderationReason moderationNote moderatedBy moderatedAt user createdAt updatedAt'
      )
      .populate('user', 'name username email role')
      .populate('moderatedBy', 'name username email role')
      .lean()

    if (!item) return null
    const [queueItem] = await this.attachReportSignals([this.mapReviewQueueItem(item as any)])
    return queueItem ?? null
  }

  private getModel(contentType: ModeratableContentType): ContentModel {
    if (!isBaseContentType(contentType)) {
      if (contentType === 'comment') return Comment as unknown as ContentModel
      return Rating as unknown as ContentModel
    }

    const model = contentModelByType[contentType]
    if (!model) {
      throw new AdminContentServiceError(400, 'contentType invalido.')
    }
    return model
  }

  private buildBaseQueueQuery(filters: AdminContentQueueFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {}

    if (filters.moderationStatus) {
      query.moderationStatus = filters.moderationStatus
    }

    if (filters.publishStatus) {
      query.status = filters.publishStatus
    }

    if (filters.creatorId) {
      query.creator = new mongoose.Types.ObjectId(filters.creatorId)
    }

    if (filters.search && filters.search.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegExp(filters.search.trim()), 'i')
      query.$or = [{ title: searchRegex }, { description: searchRegex }, { slug: searchRegex }]
    }

    return query
  }

  private buildCommentQueueQuery(filters: AdminContentQueueFilters): Record<string, unknown> {
    if (filters.publishStatus && filters.publishStatus !== 'published') {
      return publishedOnlyQuery
    }

    const query: Record<string, unknown> = {}

    if (filters.moderationStatus) {
      query.moderationStatus = filters.moderationStatus
    }

    if (filters.creatorId) {
      query.user = new mongoose.Types.ObjectId(filters.creatorId)
    }

    if (filters.search && filters.search.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegExp(filters.search.trim()), 'i')
      query.$or = [{ content: searchRegex }, { targetType: searchRegex }]
    }

    return query
  }

  private buildReviewQueueQuery(filters: AdminContentQueueFilters): Record<string, unknown> {
    if (filters.publishStatus && filters.publishStatus !== 'published') {
      return publishedOnlyQuery
    }

    const query: Record<string, unknown> = {
      review: { $regex: /\S/ },
    }

    if (filters.moderationStatus) {
      query.moderationStatus = filters.moderationStatus
    }

    if (filters.creatorId) {
      query.user = new mongoose.Types.ObjectId(filters.creatorId)
    }

    if (filters.search && filters.search.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegExp(filters.search.trim()), 'i')
      query.$or = [{ review: searchRegex }, { targetType: searchRegex }]
    }

    return query
  }

  private mapActionToStatus(action: ContentModerationAction): ContentModerationStatus {
    if (action === 'hide') return 'hidden'
    if (action === 'restrict') return 'restricted'
    return 'visible'
  }

  private async attachReportSignals(items: any[]) {
    if (items.length === 0) return items

    const summaries = await contentReportService.getOpenReportSummaries(
      items.map((item) => ({
        contentType: item.contentType as ModeratableContentType,
        contentId: item.id as string,
      }))
    )

    return items.map((item) => ({
      ...item,
      reportSignals:
        summaries.get(`${item.contentType}:${item.id}`) ?? contentReportService.getEmptySummary(),
    }))
  }

  private toSortableDate(value: unknown): number {
    if (!value) return 0
    const date = new Date(value as string | number | Date)
    const timestamp = date.getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  private mapBaseQueueItem(contentType: ContentType, item: any) {
    return {
      id: String(item._id),
      contentType,
      title: String(item.title ?? ''),
      slug: String(item.slug ?? ''),
      description: String(item.description ?? ''),
      category: String(item.category ?? ''),
      status: toPublishStatus(item.status),
      moderationStatus: toModerationStatus(item.moderationStatus),
      moderationReason: item.moderationReason ?? null,
      moderationNote: item.moderationNote ?? null,
      moderatedAt: item.moderatedAt ?? null,
      moderatedBy: item.moderatedBy ?? null,
      creator: item.creator ?? null,
      createdAt: item.createdAt ?? null,
      updatedAt: item.updatedAt ?? null,
    }
  }

  private mapCommentQueueItem(item: any) {
    const contentText = toExcerpt(item.content, 96)
    const targetType = String(item.targetType ?? '')
    const targetId = item.targetId ? String(item.targetId) : ''
    const parentComment = item.parentComment ? String(item.parentComment) : null

    return {
      id: String(item._id),
      contentType: 'comment',
      title: contentText || 'Comentario sem texto',
      slug: String(item._id),
      description: `Comentario em ${targetType}:${targetId}${parentComment ? ` (reply ${parentComment})` : ''}`,
      category: targetType || 'comment',
      status: 'published',
      moderationStatus: toModerationStatus(item.moderationStatus),
      moderationReason: item.moderationReason ?? null,
      moderationNote: item.moderationNote ?? null,
      moderatedAt: item.moderatedAt ?? null,
      moderatedBy: item.moderatedBy ?? null,
      creator: item.user ?? null,
      createdAt: item.createdAt ?? null,
      updatedAt: item.updatedAt ?? null,
    }
  }

  private mapReviewQueueItem(item: any) {
    const reviewText = toExcerpt(item.review, 96)
    const targetType = String(item.targetType ?? '')
    const targetId = item.targetId ? String(item.targetId) : ''
    const ratingValue = typeof item.rating === 'number' ? item.rating : null

    return {
      id: String(item._id),
      contentType: 'review',
      title: ratingValue !== null ? `Review ${ratingValue}/5` : 'Review',
      slug: String(item._id),
      description: reviewText || `Review em ${targetType}:${targetId}`,
      category: targetType || 'review',
      status: 'published',
      moderationStatus: toModerationStatus(item.moderationStatus),
      moderationReason: item.moderationReason ?? null,
      moderationNote: item.moderationNote ?? null,
      moderatedAt: item.moderatedAt ?? null,
      moderatedBy: item.moderatedBy ?? null,
      creator: item.user ?? null,
      createdAt: item.createdAt ?? null,
      updatedAt: item.updatedAt ?? null,
    }
  }
}

export const adminContentService = new AdminContentService()
