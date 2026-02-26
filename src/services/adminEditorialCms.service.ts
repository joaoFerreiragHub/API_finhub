import mongoose from 'mongoose'
import { ClaimRequest, ClaimRequestStatus, ClaimTargetType } from '../models/ClaimRequest'
import {
  DirectoryEntry,
  DirectoryEntryStatus,
  DirectoryOwnerType,
  DirectorySourceType,
  DirectoryVerticalType,
  DirectoryVerificationStatus,
} from '../models/DirectoryEntry'
import {
  EditorialSection,
  EditorialSectionStatus,
  EditorialSectionType,
} from '../models/EditorialSection'
import {
  EditorialSectionItem,
  EditorialSectionItemStatus,
  EditorialSectionItemTargetType,
} from '../models/EditorialSectionItem'
import {
  OwnershipEntityOwnerType,
  OwnershipEntityType,
  OwnershipTransferLog,
} from '../models/OwnershipTransferLog'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Video } from '../models/Video'
import { ContentOwnerType, ContentType } from '../models/BaseContent'
import { generateUniqueSlug, slugify } from '../utils/slugify'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

export const SECTION_STATUSES: ReadonlyArray<EditorialSectionStatus> = ['active', 'inactive']
export const SECTION_TYPES: ReadonlyArray<EditorialSectionType> = ['content', 'directory', 'mixed', 'custom']
export const SECTION_ITEM_TARGET_TYPES: ReadonlyArray<EditorialSectionItemTargetType> = [
  'article',
  'video',
  'course',
  'live',
  'podcast',
  'book',
  'directory_entry',
  'external_link',
  'custom',
]
export const SECTION_ITEM_STATUSES: ReadonlyArray<EditorialSectionItemStatus> = ['active', 'inactive']
export const DIRECTORY_VERTICAL_TYPES: ReadonlyArray<DirectoryVerticalType> = [
  'broker',
  'exchange',
  'site',
  'app',
  'podcast',
  'event',
  'other',
]
export const DIRECTORY_ENTRY_STATUSES: ReadonlyArray<DirectoryEntryStatus> = [
  'draft',
  'published',
  'archived',
]
export const DIRECTORY_VERIFICATION_STATUSES: ReadonlyArray<DirectoryVerificationStatus> = [
  'unverified',
  'pending',
  'verified',
]
export const DIRECTORY_OWNER_TYPES: ReadonlyArray<DirectoryOwnerType> = ['admin_seeded', 'creator_owned']
export const DIRECTORY_SOURCE_TYPES: ReadonlyArray<DirectorySourceType> = [
  'internal',
  'external_profile',
  'external_content',
]
export const CLAIM_STATUSES: ReadonlyArray<ClaimRequestStatus> = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
]
export const CLAIM_TARGET_TYPES: ReadonlyArray<ClaimTargetType> = [
  'article',
  'video',
  'course',
  'live',
  'podcast',
  'book',
  'directory_entry',
]
const OWNERSHIP_TARGET_TYPES: ReadonlyArray<OwnershipEntityType> = [
  'article',
  'video',
  'course',
  'live',
  'podcast',
  'book',
  'directory_entry',
]
const OWNERSHIP_OWNER_TYPES: ReadonlyArray<OwnershipEntityOwnerType> = [
  'admin_seeded',
  'creator_owned',
]

type ContentModelLike = {
  findById(id: string): any
}

const contentModelByType: Record<ContentType, ContentModelLike> = {
  article: Article as unknown as ContentModelLike,
  video: Video as unknown as ContentModelLike,
  course: Course as unknown as ContentModelLike,
  live: LiveEvent as unknown as ContentModelLike,
  podcast: Podcast as unknown as ContentModelLike,
  book: Book as unknown as ContentModelLike,
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
    throw new AdminEditorialCmsServiceError(400, `${fieldName} invalido.`)
  }
  return new mongoose.Types.ObjectId(rawId)
}

const toNullableTrimmed = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toTrimmedArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const asDateOrNull = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  throw new AdminEditorialCmsServiceError(400, 'Data invalida.')
}

const isVisibleInWindow = (now: Date, startAt: Date | null | undefined, endAt: Date | null | undefined) => {
  if (startAt && now < startAt) return false
  if (endAt && now > endAt) return false
  return true
}

const mapSectionItem = (item: any) => ({
  id: String(item._id),
  sectionId: String(item.sectionId),
  targetType: item.targetType,
  targetId: String(item.targetId),
  titleOverride: item.titleOverride ?? null,
  descriptionOverride: item.descriptionOverride ?? null,
  imageOverride: item.imageOverride ?? null,
  urlOverride: item.urlOverride ?? null,
  badge: item.badge ?? null,
  sortOrder: Number(item.sortOrder ?? 0),
  isPinned: Boolean(item.isPinned),
  status: item.status,
  startAt: item.startAt ?? null,
  endAt: item.endAt ?? null,
  metadata: item.metadata ?? null,
  createdAt: item.createdAt ?? null,
  updatedAt: item.updatedAt ?? null,
})

const mapSection = (section: any, items: any[]) => ({
  id: String(section._id),
  key: section.key,
  title: section.title,
  subtitle: section.subtitle ?? null,
  description: section.description ?? null,
  sectionType: section.sectionType,
  order: Number(section.order ?? 0),
  maxItems: Number(section.maxItems ?? 12),
  status: section.status,
  showOnHome: Boolean(section.showOnHome),
  showOnLanding: Boolean(section.showOnLanding),
  showOnShowAll: Boolean(section.showOnShowAll),
  createdBy: section.createdBy ?? null,
  updatedBy: section.updatedBy ?? null,
  createdAt: section.createdAt ?? null,
  updatedAt: section.updatedAt ?? null,
  itemCount: items.length,
  items: items.map(mapSectionItem),
})

const mapDirectory = (entry: any) => ({
  id: String(entry._id),
  name: entry.name,
  slug: entry.slug,
  verticalType: entry.verticalType,
  shortDescription: entry.shortDescription,
  description: entry.description ?? null,
  logo: entry.logo ?? null,
  coverImage: entry.coverImage ?? null,
  website: entry.website ?? null,
  canonicalUrl: entry.canonicalUrl ?? null,
  country: entry.country ?? null,
  region: entry.region ?? null,
  categories: Array.isArray(entry.categories) ? entry.categories : [],
  tags: Array.isArray(entry.tags) ? entry.tags : [],
  socialLinks: entry.socialLinks ?? null,
  status: entry.status,
  verificationStatus: entry.verificationStatus,
  isActive: Boolean(entry.isActive),
  isFeatured: Boolean(entry.isFeatured),
  showInHomeSection: Boolean(entry.showInHomeSection),
  showInDirectory: Boolean(entry.showInDirectory),
  landingEnabled: Boolean(entry.landingEnabled),
  showAllEnabled: Boolean(entry.showAllEnabled),
  ownerType: entry.ownerType,
  sourceType: entry.sourceType,
  claimable: Boolean(entry.claimable),
  ownerUser: entry.ownerUser ?? null,
  metadata: entry.metadata ?? null,
  publishedAt: entry.publishedAt ?? null,
  archivedAt: entry.archivedAt ?? null,
  createdBy: entry.createdBy ?? null,
  updatedBy: entry.updatedBy ?? null,
  createdAt: entry.createdAt ?? null,
  updatedAt: entry.updatedAt ?? null,
})

const mapClaim = (claim: any) => ({
  id: String(claim._id),
  targetType: claim.targetType,
  targetId: String(claim.targetId),
  creatorId: claim.creatorId ?? null,
  requestedBy: claim.requestedBy ?? null,
  status: claim.status,
  reason: claim.reason,
  note: claim.note ?? null,
  evidenceLinks: Array.isArray(claim.evidenceLinks) ? claim.evidenceLinks : [],
  reviewedBy: claim.reviewedBy ?? null,
  reviewedAt: claim.reviewedAt ?? null,
  reviewNote: claim.reviewNote ?? null,
  metadata: claim.metadata ?? null,
  createdAt: claim.createdAt ?? null,
  updatedAt: claim.updatedAt ?? null,
})

export const isValidSectionStatus = (value: unknown): value is EditorialSectionStatus =>
  typeof value === 'string' && SECTION_STATUSES.includes(value as EditorialSectionStatus)

export const isValidSectionType = (value: unknown): value is EditorialSectionType =>
  typeof value === 'string' && SECTION_TYPES.includes(value as EditorialSectionType)

export const isValidSectionItemTargetType = (
  value: unknown
): value is EditorialSectionItemTargetType =>
  typeof value === 'string' && SECTION_ITEM_TARGET_TYPES.includes(value as EditorialSectionItemTargetType)

export const isValidSectionItemStatus = (value: unknown): value is EditorialSectionItemStatus =>
  typeof value === 'string' && SECTION_ITEM_STATUSES.includes(value as EditorialSectionItemStatus)

export const isValidDirectoryVerticalType = (value: unknown): value is DirectoryVerticalType =>
  typeof value === 'string' && DIRECTORY_VERTICAL_TYPES.includes(value as DirectoryVerticalType)

export const isValidDirectoryStatus = (value: unknown): value is DirectoryEntryStatus =>
  typeof value === 'string' && DIRECTORY_ENTRY_STATUSES.includes(value as DirectoryEntryStatus)

export const isValidDirectoryVerificationStatus = (
  value: unknown
): value is DirectoryVerificationStatus =>
  typeof value === 'string' &&
  DIRECTORY_VERIFICATION_STATUSES.includes(value as DirectoryVerificationStatus)

export const isValidDirectoryOwnerType = (value: unknown): value is DirectoryOwnerType =>
  typeof value === 'string' && DIRECTORY_OWNER_TYPES.includes(value as DirectoryOwnerType)

export const isValidDirectorySourceType = (value: unknown): value is DirectorySourceType =>
  typeof value === 'string' && DIRECTORY_SOURCE_TYPES.includes(value as DirectorySourceType)

export const isValidClaimStatus = (value: unknown): value is ClaimRequestStatus =>
  typeof value === 'string' && CLAIM_STATUSES.includes(value as ClaimRequestStatus)

export const isValidClaimTargetType = (value: unknown): value is ClaimTargetType =>
  typeof value === 'string' && CLAIM_TARGET_TYPES.includes(value as ClaimTargetType)

const isValidOwnershipTargetType = (value: unknown): value is OwnershipEntityType =>
  typeof value === 'string' && OWNERSHIP_TARGET_TYPES.includes(value as OwnershipEntityType)

const isValidOwnershipOwnerType = (value: unknown): value is OwnershipEntityOwnerType =>
  typeof value === 'string' && OWNERSHIP_OWNER_TYPES.includes(value as OwnershipEntityOwnerType)

export class AdminEditorialCmsServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface SectionListFilters {
  status?: EditorialSectionStatus
  search?: string
}

export interface DirectoryListFilters {
  status?: DirectoryEntryStatus
  search?: string
  isActive?: boolean
  isFeatured?: boolean
  claimable?: boolean
}

export interface PublicDirectoryListOptions extends PaginationOptions {
  showAll?: boolean
  search?: string
  country?: string
  region?: string
  categories?: string[]
  tags?: string[]
  isFeatured?: boolean
  verificationStatus?: DirectoryVerificationStatus
  sort?: 'featured' | 'recent' | 'name'
}

export interface ClaimListFilters {
  status?: ClaimRequestStatus
  targetType?: ClaimTargetType
  creatorId?: string
}

export interface MyClaimListFilters {
  status?: ClaimRequestStatus
  targetType?: ClaimTargetType
}

export class AdminEditorialCmsService {
  private isContentType(value: string): value is ContentType {
    return (
      value === 'article' ||
      value === 'video' ||
      value === 'course' ||
      value === 'live' ||
      value === 'podcast' ||
      value === 'book'
    )
  }

  private async assertTargetExists(targetType: EditorialSectionItemTargetType, targetId: string) {
    if (targetType === 'external_link' || targetType === 'custom') {
      return
    }

    toObjectId(targetId, 'targetId')
    if (targetType === 'directory_entry') {
      const entry = await DirectoryEntry.findById(targetId).select('_id').lean()
      if (!entry) {
        throw new AdminEditorialCmsServiceError(404, 'DirectoryEntry alvo nao encontrado.')
      }
      return
    }

    if (!this.isContentType(targetType)) {
      throw new AdminEditorialCmsServiceError(400, 'targetType invalido.')
    }
    const model = contentModelByType[targetType]
    const item = await model.findById(targetId).select('_id').lean()
    if (!item) {
      throw new AdminEditorialCmsServiceError(404, `Conteudo alvo (${targetType}) nao encontrado.`)
    }
  }

  async listSections(filters: SectionListFilters = {}, options: PaginationOptions = {}) {
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit
    const query: Record<string, unknown> = {}

    if (filters.status) {
      if (!isValidSectionStatus(filters.status)) {
        throw new AdminEditorialCmsServiceError(400, 'status invalido.')
      }
      query.status = filters.status
    }

    if (filters.search && filters.search.trim().length > 0) {
      const regex = new RegExp(escapeRegExp(filters.search.trim()), 'i')
      query.$or = [{ key: regex }, { title: regex }, { subtitle: regex }, { description: regex }]
    }

    const [sections, total] = await Promise.all([
      EditorialSection.find(query).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limit).lean(),
      EditorialSection.countDocuments(query),
    ])

    const sectionIds = sections.map((section) => String(section._id))
    const items = sectionIds.length
      ? await EditorialSectionItem.find({ sectionId: { $in: sectionIds } })
          .sort({ isPinned: -1, sortOrder: 1, createdAt: 1 })
          .lean()
      : []

    const grouped = new Map<string, any[]>()
    for (const item of items) {
      const key = String(item.sectionId)
      const list = grouped.get(key) ?? []
      list.push(item)
      grouped.set(key, list)
    }

    return {
      items: sections.map((section) => mapSection(section, grouped.get(String(section._id)) ?? [])),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async createSection(input: {
    actorId: string
    key?: string
    title: string
    subtitle?: string
    description?: string
    sectionType?: EditorialSectionType
    order?: number
    maxItems?: number
    status?: EditorialSectionStatus
    showOnHome?: boolean
    showOnLanding?: boolean
    showOnShowAll?: boolean
  }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const title = toNullableTrimmed(input.title)
    if (!title) {
      throw new AdminEditorialCmsServiceError(400, 'title e obrigatorio.')
    }
    if (input.sectionType && !isValidSectionType(input.sectionType)) {
      throw new AdminEditorialCmsServiceError(400, 'sectionType invalido.')
    }
    if (input.status && !isValidSectionStatus(input.status)) {
      throw new AdminEditorialCmsServiceError(400, 'status invalido.')
    }

    const baseKey = slugify((input.key ?? title).trim())
    if (!baseKey) {
      throw new AdminEditorialCmsServiceError(400, 'key invalida.')
    }

    const key = await generateUniqueSlug(baseKey, async (candidate) => {
      const exists = await EditorialSection.findOne({ key: candidate }).select('_id').lean()
      return exists !== null
    })

    const section = await EditorialSection.create({
      key,
      title,
      subtitle: toNullableTrimmed(input.subtitle),
      description: toNullableTrimmed(input.description),
      sectionType: input.sectionType ?? 'mixed',
      order: typeof input.order === 'number' ? Math.max(0, Math.floor(input.order)) : 0,
      maxItems: typeof input.maxItems === 'number' ? Math.min(100, Math.max(1, Math.floor(input.maxItems))) : 12,
      status: input.status ?? 'active',
      showOnHome: typeof input.showOnHome === 'boolean' ? input.showOnHome : true,
      showOnLanding: typeof input.showOnLanding === 'boolean' ? input.showOnLanding : true,
      showOnShowAll: typeof input.showOnShowAll === 'boolean' ? input.showOnShowAll : true,
      createdBy: actorId,
      updatedBy: actorId,
    })

    return mapSection(section.toObject(), [])
  }

  async updateSection(
    sectionIdRaw: string,
    input: {
      actorId: string
      key?: string
      title?: string
      subtitle?: string | null
      description?: string | null
      sectionType?: EditorialSectionType
      order?: number
      maxItems?: number
      status?: EditorialSectionStatus
      showOnHome?: boolean
      showOnLanding?: boolean
      showOnShowAll?: boolean
    }
  ) {
    const actorId = toObjectId(input.actorId, 'actorId')
    toObjectId(sectionIdRaw, 'sectionId')
    const section = await EditorialSection.findById(sectionIdRaw)
    if (!section) {
      throw new AdminEditorialCmsServiceError(404, 'Secao nao encontrada.')
    }

    if (input.sectionType && !isValidSectionType(input.sectionType)) {
      throw new AdminEditorialCmsServiceError(400, 'sectionType invalido.')
    }
    if (input.status && !isValidSectionStatus(input.status)) {
      throw new AdminEditorialCmsServiceError(400, 'status invalido.')
    }

    if (typeof input.key === 'string' && input.key.trim().length > 0) {
      const baseKey = slugify(input.key)
      const nextKey = await generateUniqueSlug(baseKey, async (candidate) => {
        const exists = await EditorialSection.findOne({
          key: candidate,
          _id: { $ne: section._id },
        })
          .select('_id')
          .lean()
        return exists !== null
      })
      section.key = nextKey
    }

    if (typeof input.title === 'string') {
      const title = input.title.trim()
      if (!title) {
        throw new AdminEditorialCmsServiceError(400, 'title nao pode ser vazio.')
      }
      section.title = title
    }

    if (typeof input.subtitle !== 'undefined') section.subtitle = toNullableTrimmed(input.subtitle) ?? undefined
    if (typeof input.description !== 'undefined') {
      section.description = toNullableTrimmed(input.description) ?? undefined
    }
    if (typeof input.order === 'number') section.order = Math.max(0, Math.floor(input.order))
    if (typeof input.maxItems === 'number') {
      section.maxItems = Math.min(100, Math.max(1, Math.floor(input.maxItems)))
    }
    if (input.sectionType) section.sectionType = input.sectionType
    if (input.status) section.status = input.status
    if (typeof input.showOnHome === 'boolean') section.showOnHome = input.showOnHome
    if (typeof input.showOnLanding === 'boolean') section.showOnLanding = input.showOnLanding
    if (typeof input.showOnShowAll === 'boolean') section.showOnShowAll = input.showOnShowAll
    section.updatedBy = actorId

    await section.save()

    const items = await EditorialSectionItem.find({ sectionId: section._id })
      .sort({ isPinned: -1, sortOrder: 1, createdAt: 1 })
      .lean()
    return mapSection(section.toObject(), items)
  }

  async addSectionItem(
    sectionIdRaw: string,
    input: {
      actorId: string
      targetType: EditorialSectionItemTargetType
      targetId: string
      titleOverride?: string
      descriptionOverride?: string
      imageOverride?: string
      urlOverride?: string
      badge?: string
      sortOrder?: number
      isPinned?: boolean
      status?: EditorialSectionItemStatus
      startAt?: Date | string | null
      endAt?: Date | string | null
      metadata?: Record<string, unknown> | null
    }
  ) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const sectionId = toObjectId(sectionIdRaw, 'sectionId')
    const section = await EditorialSection.findById(sectionId)
    if (!section) {
      throw new AdminEditorialCmsServiceError(404, 'Secao nao encontrada.')
    }

    if (!isValidSectionItemTargetType(input.targetType)) {
      throw new AdminEditorialCmsServiceError(400, 'targetType invalido.')
    }
    if (input.status && !isValidSectionItemStatus(input.status)) {
      throw new AdminEditorialCmsServiceError(400, 'status invalido.')
    }

    const targetId = toNullableTrimmed(input.targetId)
    if (!targetId) {
      throw new AdminEditorialCmsServiceError(400, 'targetId e obrigatorio.')
    }

    await this.assertTargetExists(input.targetType, targetId)

    let sortOrder = typeof input.sortOrder === 'number' ? Math.max(0, Math.floor(input.sortOrder)) : null
    if (sortOrder === null) {
      const lastItem = await EditorialSectionItem.findOne({ sectionId }).sort({ sortOrder: -1 }).lean()
      sortOrder = typeof lastItem?.sortOrder === 'number' ? lastItem.sortOrder + 1 : 0
    }

    const startAt = asDateOrNull(input.startAt)
    const endAt = asDateOrNull(input.endAt)
    if (startAt && endAt && startAt.getTime() > endAt.getTime()) {
      throw new AdminEditorialCmsServiceError(400, 'startAt nao pode ser superior a endAt.')
    }

    try {
      const item = await EditorialSectionItem.create({
        sectionId,
        targetType: input.targetType,
        targetId,
        titleOverride: toNullableTrimmed(input.titleOverride),
        descriptionOverride: toNullableTrimmed(input.descriptionOverride),
        imageOverride: toNullableTrimmed(input.imageOverride),
        urlOverride: toNullableTrimmed(input.urlOverride),
        badge: toNullableTrimmed(input.badge),
        sortOrder,
        isPinned: typeof input.isPinned === 'boolean' ? input.isPinned : false,
        status: input.status ?? 'active',
        startAt,
        endAt,
        metadata: input.metadata ?? null,
        createdBy: actorId,
        updatedBy: actorId,
      })

      return mapSectionItem(item.toObject())
    } catch (error: unknown) {
      if (error instanceof mongoose.Error && 'code' in error && (error as any).code === 11000) {
        throw new AdminEditorialCmsServiceError(
          409,
          'Item ja existe nesta secao para o mesmo targetType/targetId.'
        )
      }
      throw error
    }
  }

  async reorderSectionItems(
    sectionIdRaw: string,
    input: {
      actorId: string
      items: Array<{
        itemId: string
        sortOrder: number
        isPinned?: boolean
        status?: EditorialSectionItemStatus
      }>
    }
  ) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const sectionId = toObjectId(sectionIdRaw, 'sectionId')
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new AdminEditorialCmsServiceError(400, 'items e obrigatorio para reorder.')
    }

    const section = await EditorialSection.findById(sectionId)
    if (!section) {
      throw new AdminEditorialCmsServiceError(404, 'Secao nao encontrada.')
    }

    const updates = input.items.map((item) => {
      toObjectId(item.itemId, 'itemId')
      if (!Number.isFinite(item.sortOrder) || item.sortOrder < 0) {
        throw new AdminEditorialCmsServiceError(400, 'sortOrder invalido em items.')
      }
      if (item.status && !isValidSectionItemStatus(item.status)) {
        throw new AdminEditorialCmsServiceError(400, 'status invalido em items.')
      }
      return {
        itemId: item.itemId,
        sortOrder: Math.floor(item.sortOrder),
        isPinned: item.isPinned,
        status: item.status,
      }
    })

    const ids = updates.map((item) => item.itemId)
    const foundItems = await EditorialSectionItem.find({ _id: { $in: ids }, sectionId }).select('_id').lean()
    if (foundItems.length !== ids.length) {
      throw new AdminEditorialCmsServiceError(404, 'Um ou mais items nao pertencem a secao.')
    }

    const now = new Date()
    await EditorialSectionItem.bulkWrite(
      updates.map((item) => ({
        updateOne: {
          filter: { _id: item.itemId, sectionId },
          update: {
            $set: {
              sortOrder: item.sortOrder,
              ...(typeof item.isPinned === 'boolean' ? { isPinned: item.isPinned } : {}),
              ...(item.status ? { status: item.status } : {}),
              updatedBy: actorId,
              updatedAt: now,
            },
          },
        },
      }))
    )

    const items = await EditorialSectionItem.find({ sectionId })
      .sort({ isPinned: -1, sortOrder: 1, createdAt: 1 })
      .lean()

    return {
      sectionId: String(sectionId),
      items: items.map(mapSectionItem),
    }
  }

  async removeSectionItem(sectionIdRaw: string, itemIdRaw: string) {
    toObjectId(sectionIdRaw, 'sectionId')
    toObjectId(itemIdRaw, 'itemId')
    const removed = await EditorialSectionItem.findOneAndDelete({
      _id: itemIdRaw,
      sectionId: sectionIdRaw,
    }).lean()

    if (!removed) {
      throw new AdminEditorialCmsServiceError(404, 'Item editorial nao encontrado.')
    }

    return {
      removed: true,
      sectionId: sectionIdRaw,
      itemId: itemIdRaw,
    }
  }

  async listDirectories(
    vertical: DirectoryVerticalType,
    filters: DirectoryListFilters = {},
    options: PaginationOptions = {}
  ) {
    if (!isValidDirectoryVerticalType(vertical)) {
      throw new AdminEditorialCmsServiceError(400, 'vertical invalido.')
    }
    if (filters.status && !isValidDirectoryStatus(filters.status)) {
      throw new AdminEditorialCmsServiceError(400, 'status invalido.')
    }

    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit
    const query: Record<string, unknown> = { verticalType: vertical }

    if (filters.status) query.status = filters.status
    if (typeof filters.isActive === 'boolean') query.isActive = filters.isActive
    if (typeof filters.isFeatured === 'boolean') query.isFeatured = filters.isFeatured
    if (typeof filters.claimable === 'boolean') query.claimable = filters.claimable

    if (filters.search && filters.search.trim().length > 0) {
      const regex = new RegExp(escapeRegExp(filters.search.trim()), 'i')
      query.$or = [{ name: regex }, { slug: regex }, { shortDescription: regex }, { tags: regex }]
    }

    const [items, total] = await Promise.all([
      DirectoryEntry.find(query)
        .sort({ isFeatured: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('ownerUser', 'name username email role')
        .populate('createdBy', 'name username email role')
        .populate('updatedBy', 'name username email role')
        .lean(),
      DirectoryEntry.countDocuments(query),
    ])

    return {
      items: items.map(mapDirectory),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async createDirectory(
    vertical: DirectoryVerticalType,
    input: {
      actorId: string
      name: string
      slug?: string
      shortDescription: string
      description?: string
      logo?: string
      coverImage?: string
      website?: string
      canonicalUrl?: string
      country?: string
      region?: string
      categories?: string[]
      tags?: string[]
      socialLinks?: Record<string, unknown>
      status?: DirectoryEntryStatus
      verificationStatus?: DirectoryVerificationStatus
      isActive?: boolean
      isFeatured?: boolean
      showInHomeSection?: boolean
      showInDirectory?: boolean
      landingEnabled?: boolean
      showAllEnabled?: boolean
      ownerType?: DirectoryOwnerType
      sourceType?: DirectorySourceType
      claimable?: boolean
      ownerUserId?: string | null
      metadata?: Record<string, unknown> | null
    }
  ) {
    if (!isValidDirectoryVerticalType(vertical)) {
      throw new AdminEditorialCmsServiceError(400, 'vertical invalido.')
    }

    const actorId = toObjectId(input.actorId, 'actorId')
    const name = toNullableTrimmed(input.name)
    const shortDescription = toNullableTrimmed(input.shortDescription)
    if (!name) {
      throw new AdminEditorialCmsServiceError(400, 'name e obrigatorio.')
    }
    if (!shortDescription) {
      throw new AdminEditorialCmsServiceError(400, 'shortDescription e obrigatorio.')
    }

    if (input.status && !isValidDirectoryStatus(input.status)) {
      throw new AdminEditorialCmsServiceError(400, 'status invalido.')
    }
    if (input.verificationStatus && !isValidDirectoryVerificationStatus(input.verificationStatus)) {
      throw new AdminEditorialCmsServiceError(400, 'verificationStatus invalido.')
    }
    if (input.ownerType && !isValidDirectoryOwnerType(input.ownerType)) {
      throw new AdminEditorialCmsServiceError(400, 'ownerType invalido.')
    }
    if (input.sourceType && !isValidDirectorySourceType(input.sourceType)) {
      throw new AdminEditorialCmsServiceError(400, 'sourceType invalido.')
    }

    const baseSlug = slugify(input.slug?.trim() || name)
    if (!baseSlug) {
      throw new AdminEditorialCmsServiceError(400, 'slug invalida.')
    }
    const slug = await generateUniqueSlug(baseSlug, async (candidate) => {
      const exists = await DirectoryEntry.findOne({ slug: candidate }).select('_id').lean()
      return exists !== null
    })

    const ownerUser = input.ownerUserId ? toObjectId(input.ownerUserId, 'ownerUserId') : null
    const status = input.status ?? 'draft'
    const now = new Date()

    const created = await DirectoryEntry.create({
      verticalType: vertical,
      name,
      slug,
      shortDescription,
      description: toNullableTrimmed(input.description),
      logo: toNullableTrimmed(input.logo),
      coverImage: toNullableTrimmed(input.coverImage),
      website: toNullableTrimmed(input.website),
      canonicalUrl: toNullableTrimmed(input.canonicalUrl),
      country: toNullableTrimmed(input.country),
      region: toNullableTrimmed(input.region),
      categories: toTrimmedArray(input.categories),
      tags: toTrimmedArray(input.tags),
      socialLinks: input.socialLinks ?? null,
      status,
      verificationStatus: input.verificationStatus ?? 'unverified',
      isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
      isFeatured: typeof input.isFeatured === 'boolean' ? input.isFeatured : false,
      showInHomeSection: typeof input.showInHomeSection === 'boolean' ? input.showInHomeSection : false,
      showInDirectory: typeof input.showInDirectory === 'boolean' ? input.showInDirectory : true,
      landingEnabled: typeof input.landingEnabled === 'boolean' ? input.landingEnabled : true,
      showAllEnabled: typeof input.showAllEnabled === 'boolean' ? input.showAllEnabled : true,
      ownerType: input.ownerType ?? 'admin_seeded',
      sourceType: input.sourceType ?? 'internal',
      claimable: typeof input.claimable === 'boolean' ? input.claimable : true,
      ownerUser,
      metadata: input.metadata ?? null,
      publishedAt: status === 'published' ? now : null,
      archivedAt: status === 'archived' ? now : null,
      createdBy: actorId,
      updatedBy: actorId,
    })

    return mapDirectory(created.toObject())
  }

  async updateDirectory(
    vertical: DirectoryVerticalType,
    entryIdRaw: string,
    input: {
      actorId: string
      name?: string
      slug?: string
      shortDescription?: string
      description?: string
      logo?: string
      coverImage?: string
      website?: string
      canonicalUrl?: string
      country?: string
      region?: string
      categories?: string[]
      tags?: string[]
      socialLinks?: Record<string, unknown>
      status?: DirectoryEntryStatus
      verificationStatus?: DirectoryVerificationStatus
      isActive?: boolean
      isFeatured?: boolean
      showInHomeSection?: boolean
      showInDirectory?: boolean
      landingEnabled?: boolean
      showAllEnabled?: boolean
      ownerType?: DirectoryOwnerType
      sourceType?: DirectorySourceType
      claimable?: boolean
      ownerUserId?: string | null
      metadata?: Record<string, unknown> | null
    }
  ) {
    if (!isValidDirectoryVerticalType(vertical)) {
      throw new AdminEditorialCmsServiceError(400, 'vertical invalido.')
    }
    const actorId = toObjectId(input.actorId, 'actorId')
    toObjectId(entryIdRaw, 'entryId')
    const entry = await DirectoryEntry.findOne({ _id: entryIdRaw, verticalType: vertical })
    if (!entry) {
      throw new AdminEditorialCmsServiceError(404, 'Diretorio nao encontrado.')
    }

    if (input.status && !isValidDirectoryStatus(input.status)) {
      throw new AdminEditorialCmsServiceError(400, 'status invalido.')
    }
    if (input.verificationStatus && !isValidDirectoryVerificationStatus(input.verificationStatus)) {
      throw new AdminEditorialCmsServiceError(400, 'verificationStatus invalido.')
    }
    if (input.ownerType && !isValidDirectoryOwnerType(input.ownerType)) {
      throw new AdminEditorialCmsServiceError(400, 'ownerType invalido.')
    }
    if (input.sourceType && !isValidDirectorySourceType(input.sourceType)) {
      throw new AdminEditorialCmsServiceError(400, 'sourceType invalido.')
    }

    if (typeof input.name === 'string') {
      const name = input.name.trim()
      if (!name) throw new AdminEditorialCmsServiceError(400, 'name nao pode ser vazio.')
      entry.name = name
    }
    if (typeof input.shortDescription === 'string') {
      const shortDescription = input.shortDescription.trim()
      if (!shortDescription) {
        throw new AdminEditorialCmsServiceError(400, 'shortDescription nao pode ser vazio.')
      }
      entry.shortDescription = shortDescription
    }

    if (typeof input.slug === 'string' && input.slug.trim().length > 0) {
      const baseSlug = slugify(input.slug)
      const nextSlug = await generateUniqueSlug(baseSlug, async (candidate) => {
        const exists = await DirectoryEntry.findOne({ slug: candidate, _id: { $ne: entry._id } })
          .select('_id')
          .lean()
        return exists !== null
      })
      entry.slug = nextSlug
    }

    if (typeof input.description !== 'undefined') entry.description = toNullableTrimmed(input.description) ?? undefined
    if (typeof input.logo !== 'undefined') entry.logo = toNullableTrimmed(input.logo) ?? undefined
    if (typeof input.coverImage !== 'undefined') entry.coverImage = toNullableTrimmed(input.coverImage) ?? undefined
    if (typeof input.website !== 'undefined') entry.website = toNullableTrimmed(input.website) ?? undefined
    if (typeof input.canonicalUrl !== 'undefined') {
      entry.canonicalUrl = toNullableTrimmed(input.canonicalUrl) ?? undefined
    }
    if (typeof input.country !== 'undefined') entry.country = toNullableTrimmed(input.country) ?? undefined
    if (typeof input.region !== 'undefined') entry.region = toNullableTrimmed(input.region) ?? undefined
    if (Array.isArray(input.categories)) entry.categories = toTrimmedArray(input.categories)
    if (Array.isArray(input.tags)) entry.tags = toTrimmedArray(input.tags)
    if (typeof input.socialLinks !== 'undefined') entry.socialLinks = input.socialLinks as any

    if (input.status) {
      entry.status = input.status
      if (input.status === 'published') {
        entry.publishedAt = new Date()
        entry.archivedAt = null
        entry.isActive = true
      } else if (input.status === 'archived') {
        entry.archivedAt = new Date()
        entry.isActive = false
      }
    }

    if (input.verificationStatus) entry.verificationStatus = input.verificationStatus
    if (typeof input.isActive === 'boolean') entry.isActive = input.isActive
    if (typeof input.isFeatured === 'boolean') entry.isFeatured = input.isFeatured
    if (typeof input.showInHomeSection === 'boolean') entry.showInHomeSection = input.showInHomeSection
    if (typeof input.showInDirectory === 'boolean') entry.showInDirectory = input.showInDirectory
    if (typeof input.landingEnabled === 'boolean') entry.landingEnabled = input.landingEnabled
    if (typeof input.showAllEnabled === 'boolean') entry.showAllEnabled = input.showAllEnabled
    if (input.ownerType) entry.ownerType = input.ownerType
    if (input.sourceType) entry.sourceType = input.sourceType
    if (typeof input.claimable === 'boolean') entry.claimable = input.claimable
    if (typeof input.ownerUserId !== 'undefined') {
      entry.ownerUser = input.ownerUserId ? toObjectId(input.ownerUserId, 'ownerUserId') : null
    }
    if (typeof input.metadata !== 'undefined') entry.metadata = input.metadata ?? null

    entry.updatedBy = actorId
    await entry.save()

    return mapDirectory(entry.toObject())
  }

  async publishDirectory(
    vertical: DirectoryVerticalType,
    entryIdRaw: string,
    actorIdRaw: string,
    reason?: string
  ) {
    if (!isValidDirectoryVerticalType(vertical)) {
      throw new AdminEditorialCmsServiceError(400, 'vertical invalido.')
    }
    const actorId = toObjectId(actorIdRaw, 'actorId')
    toObjectId(entryIdRaw, 'entryId')
    const entry = await DirectoryEntry.findOne({ _id: entryIdRaw, verticalType: vertical })
    if (!entry) {
      throw new AdminEditorialCmsServiceError(404, 'Diretorio nao encontrado.')
    }
    const changed = entry.status !== 'published'
    entry.status = 'published'
    entry.isActive = true
    entry.publishedAt = new Date()
    entry.archivedAt = null
    entry.updatedBy = actorId
    if (reason && reason.trim().length > 0) {
      entry.metadata = {
        ...(entry.metadata as Record<string, unknown> | null),
        lastPublishReason: reason.trim(),
      }
    }
    await entry.save()
    return { changed, entry: mapDirectory(entry.toObject()) }
  }

  async archiveDirectory(
    vertical: DirectoryVerticalType,
    entryIdRaw: string,
    actorIdRaw: string,
    reason?: string
  ) {
    if (!isValidDirectoryVerticalType(vertical)) {
      throw new AdminEditorialCmsServiceError(400, 'vertical invalido.')
    }
    const actorId = toObjectId(actorIdRaw, 'actorId')
    toObjectId(entryIdRaw, 'entryId')
    const entry = await DirectoryEntry.findOne({ _id: entryIdRaw, verticalType: vertical })
    if (!entry) {
      throw new AdminEditorialCmsServiceError(404, 'Diretorio nao encontrado.')
    }
    const changed = entry.status !== 'archived'
    entry.status = 'archived'
    entry.isActive = false
    entry.archivedAt = new Date()
    entry.updatedBy = actorId
    if (reason && reason.trim().length > 0) {
      entry.metadata = {
        ...(entry.metadata as Record<string, unknown> | null),
        lastArchiveReason: reason.trim(),
      }
    }
    await entry.save()
    return { changed, entry: mapDirectory(entry.toObject()) }
  }

  private async assertClaimTargetClaimable(targetType: ClaimTargetType, targetIdRaw: string, creatorIdRaw: string) {
    const creatorId = String(toObjectId(creatorIdRaw, 'creatorId'))
    toObjectId(targetIdRaw, 'targetId')

    if (targetType === 'directory_entry') {
      const entry = await DirectoryEntry.findById(targetIdRaw)
        .select('claimable ownerType ownerUser status')
        .lean()

      if (!entry) {
        throw new AdminEditorialCmsServiceError(404, 'Alvo do claim nao encontrado.')
      }
      if (entry.status === 'archived') {
        throw new AdminEditorialCmsServiceError(409, 'Nao e possivel reclamar um recurso arquivado.')
      }
      if (!entry.claimable) {
        throw new AdminEditorialCmsServiceError(409, 'Este recurso nao esta disponivel para claim.')
      }
      if (entry.ownerType === 'creator_owned' && entry.ownerUser && String(entry.ownerUser) === creatorId) {
        throw new AdminEditorialCmsServiceError(409, 'Este recurso ja pertence ao creator.')
      }
      return
    }

    if (!this.isContentType(targetType)) {
      throw new AdminEditorialCmsServiceError(400, 'targetType invalido.')
    }
    const model = contentModelByType[targetType]
    const content = await model.findById(targetIdRaw).select('claimable ownerType creator status').lean()

    if (!content) {
      throw new AdminEditorialCmsServiceError(404, `Conteudo alvo (${targetType}) nao encontrado.`)
    }
    if (content.status === 'archived') {
      throw new AdminEditorialCmsServiceError(409, 'Nao e possivel reclamar conteudo arquivado.')
    }
    if (!content.claimable) {
      throw new AdminEditorialCmsServiceError(409, 'Este conteudo nao esta disponivel para claim.')
    }
    if (
      content.ownerType === 'creator_owned' &&
      content.creator &&
      String(content.creator) === creatorId
    ) {
      throw new AdminEditorialCmsServiceError(409, 'Este conteudo ja pertence ao creator.')
    }
  }

  async createClaimRequest(input: {
    requestedById: string
    creatorId?: string
    targetType: ClaimTargetType
    targetId: string
    reason: string
    note?: string
    evidenceLinks?: string[]
  }) {
    if (!isValidClaimTargetType(input.targetType)) {
      throw new AdminEditorialCmsServiceError(400, 'targetType invalido.')
    }
    const requestedById = toObjectId(input.requestedById, 'requestedById')
    const creatorId = toObjectId(input.creatorId ?? input.requestedById, 'creatorId')
    const reason = toNullableTrimmed(input.reason)
    if (!reason) {
      throw new AdminEditorialCmsServiceError(400, 'reason e obrigatorio.')
    }

    await this.assertClaimTargetClaimable(input.targetType, input.targetId, String(creatorId))

    const evidenceLinks = (input.evidenceLinks ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, 10)

    try {
      const created = await ClaimRequest.create({
        targetType: input.targetType,
        targetId: String(toObjectId(input.targetId, 'targetId')),
        creatorId,
        requestedBy: requestedById,
        status: 'pending',
        reason,
        note: toNullableTrimmed(input.note),
        evidenceLinks,
      })

      const populated = await ClaimRequest.findById(created._id)
        .populate('creatorId', 'name username email role')
        .populate('requestedBy', 'name username email role')
        .lean()

      return populated ? mapClaim(populated) : mapClaim(created.toObject())
    } catch (error: unknown) {
      const mongoError = error as { code?: number }
      if (mongoError.code === 11000) {
        throw new AdminEditorialCmsServiceError(409, 'Ja existe um claim pendente para este alvo.')
      }
      throw error
    }
  }

  async listMyClaims(
    requestedByIdRaw: string,
    filters: MyClaimListFilters = {},
    options: PaginationOptions = {}
  ) {
    if (filters.status && !isValidClaimStatus(filters.status)) {
      throw new AdminEditorialCmsServiceError(400, 'status invalido.')
    }
    if (filters.targetType && !isValidClaimTargetType(filters.targetType)) {
      throw new AdminEditorialCmsServiceError(400, 'targetType invalido.')
    }

    const requestedById = toObjectId(requestedByIdRaw, 'requestedById')
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit
    const query: Record<string, unknown> = {
      requestedBy: requestedById,
    }

    if (filters.status) query.status = filters.status
    if (filters.targetType) query.targetType = filters.targetType

    const [items, total] = await Promise.all([
      ClaimRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('creatorId', 'name username email role')
        .populate('requestedBy', 'name username email role')
        .populate('reviewedBy', 'name username email role')
        .lean(),
      ClaimRequest.countDocuments(query),
    ])

    return {
      items: items.map(mapClaim),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async cancelClaimRequest(claimIdRaw: string, input: { actorId: string; note?: string }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    toObjectId(claimIdRaw, 'claimId')
    const claim = await ClaimRequest.findById(claimIdRaw)
    if (!claim) {
      throw new AdminEditorialCmsServiceError(404, 'Claim nao encontrado.')
    }

    const actorIdString = String(actorId)
    if (String(claim.requestedBy) !== actorIdString && String(claim.creatorId) !== actorIdString) {
      throw new AdminEditorialCmsServiceError(403, 'Sem permissao para cancelar este claim.')
    }
    if (claim.status !== 'pending') {
      throw new AdminEditorialCmsServiceError(409, `Claim nao esta pendente (${claim.status}).`)
    }

    claim.status = 'cancelled'
    claim.reviewedBy = actorId
    claim.reviewedAt = new Date()
    claim.reviewNote = toNullableTrimmed(input.note) ?? undefined
    await claim.save()

    const populated = await ClaimRequest.findById(claim._id)
      .populate('creatorId', 'name username email role')
      .populate('requestedBy', 'name username email role')
      .populate('reviewedBy', 'name username email role')
      .lean()

    return populated ? mapClaim(populated) : mapClaim(claim.toObject())
  }

  async listClaims(filters: ClaimListFilters = {}, options: PaginationOptions = {}) {
    if (filters.status && !isValidClaimStatus(filters.status)) {
      throw new AdminEditorialCmsServiceError(400, 'status invalido.')
    }
    if (filters.targetType && !isValidClaimTargetType(filters.targetType)) {
      throw new AdminEditorialCmsServiceError(400, 'targetType invalido.')
    }
    if (filters.creatorId) {
      toObjectId(filters.creatorId, 'creatorId')
    }

    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit
    const query: Record<string, unknown> = {}
    if (filters.status) query.status = filters.status
    if (filters.targetType) query.targetType = filters.targetType
    if (filters.creatorId) query.creatorId = toObjectId(filters.creatorId, 'creatorId')

    const [items, total] = await Promise.all([
      ClaimRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('creatorId', 'name username email role')
        .populate('requestedBy', 'name username email role')
        .populate('reviewedBy', 'name username email role')
        .lean(),
      ClaimRequest.countDocuments(query),
    ])

    return {
      items: items.map(mapClaim),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async approveClaim(claimIdRaw: string, input: { actorId: string; note?: string }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    toObjectId(claimIdRaw, 'claimId')
    const claim = await ClaimRequest.findById(claimIdRaw)
    if (!claim) {
      throw new AdminEditorialCmsServiceError(404, 'Claim nao encontrado.')
    }
    if (claim.status !== 'pending') {
      throw new AdminEditorialCmsServiceError(409, `Claim nao esta pendente (${claim.status}).`)
    }

    const transfer = await this.transferOwnership({
      actorId: String(actorId),
      targetType: claim.targetType as OwnershipEntityType,
      targetId: claim.targetId,
      toOwnerType: 'creator_owned',
      toOwnerUserId: String(claim.creatorId),
      reason: input.note?.trim() || claim.reason,
      note: input.note,
    })

    claim.status = 'approved'
    claim.reviewedBy = actorId
    claim.reviewedAt = new Date()
    claim.reviewNote = toNullableTrimmed(input.note) ?? undefined
    claim.metadata = {
      ...(claim.metadata && typeof claim.metadata === 'object' ? claim.metadata : {}),
      transferLogId: transfer.transferLogId,
      transferAppliedAt: new Date().toISOString(),
    }
    await claim.save()

    const populated = await ClaimRequest.findById(claim._id)
      .populate('creatorId', 'name username email role')
      .populate('requestedBy', 'name username email role')
      .populate('reviewedBy', 'name username email role')
      .lean()

    return {
      claim: populated ? mapClaim(populated) : mapClaim(claim.toObject()),
      transfer,
    }
  }

  async rejectClaim(claimIdRaw: string, input: { actorId: string; note?: string }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    toObjectId(claimIdRaw, 'claimId')
    const claim = await ClaimRequest.findById(claimIdRaw)
    if (!claim) {
      throw new AdminEditorialCmsServiceError(404, 'Claim nao encontrado.')
    }
    if (claim.status !== 'pending') {
      throw new AdminEditorialCmsServiceError(409, `Claim nao esta pendente (${claim.status}).`)
    }

    claim.status = 'rejected'
    claim.reviewedBy = actorId
    claim.reviewedAt = new Date()
    claim.reviewNote = toNullableTrimmed(input.note) ?? undefined
    await claim.save()

    const populated = await ClaimRequest.findById(claim._id)
      .populate('creatorId', 'name username email role')
      .populate('requestedBy', 'name username email role')
      .populate('reviewedBy', 'name username email role')
      .lean()

    return populated ? mapClaim(populated) : mapClaim(claim.toObject())
  }

  async transferOwnership(input: {
    actorId: string
    targetType: OwnershipEntityType
    targetId: string
    toOwnerType: OwnershipEntityOwnerType
    toOwnerUserId?: string | null
    reason: string
    note?: string
  }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    if (!isValidOwnershipTargetType(input.targetType)) {
      throw new AdminEditorialCmsServiceError(400, 'targetType invalido.')
    }
    if (!isValidOwnershipOwnerType(input.toOwnerType)) {
      throw new AdminEditorialCmsServiceError(400, 'toOwnerType invalido.')
    }
    const reason = toNullableTrimmed(input.reason)
    if (!reason) {
      throw new AdminEditorialCmsServiceError(400, 'reason e obrigatorio.')
    }

    const snapshot = await this.loadOwnershipSnapshot(input.targetType, input.targetId)
    const toOwnerUserId = input.toOwnerUserId ? String(toObjectId(input.toOwnerUserId, 'toOwnerUserId')) : null

    await this.applyOwnershipChange({
      targetType: input.targetType,
      targetId: input.targetId,
      toOwnerType: input.toOwnerType,
      toOwnerUserId,
      actorId: String(actorId),
    })

    const transferLog = await OwnershipTransferLog.create({
      targetType: input.targetType,
      targetId: input.targetId,
      fromOwnerType: snapshot.fromOwnerType,
      toOwnerType: input.toOwnerType,
      fromOwnerUser: snapshot.fromOwnerUserId ? new mongoose.Types.ObjectId(snapshot.fromOwnerUserId) : null,
      toOwnerUser: toOwnerUserId ? new mongoose.Types.ObjectId(toOwnerUserId) : null,
      transferredBy: actorId,
      reason,
      note: toNullableTrimmed(input.note),
      metadata: snapshot.metadata ?? null,
    })

    return {
      changed:
        snapshot.fromOwnerType !== input.toOwnerType || snapshot.fromOwnerUserId !== toOwnerUserId,
      targetType: input.targetType,
      targetId: input.targetId,
      fromOwnerType: snapshot.fromOwnerType,
      fromOwnerUserId: snapshot.fromOwnerUserId,
      toOwnerType: input.toOwnerType,
      toOwnerUserId,
      transferLogId: String(transferLog._id),
      transferAt: transferLog.createdAt,
    }
  }

  async listPublicHomeSections() {
    const now = new Date()
    const sections = await EditorialSection.find({
      status: 'active',
      showOnHome: true,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean()

    if (sections.length === 0) {
      return { items: [] as any[] }
    }

    const sectionIds = sections.map((section) => section._id)
    const items = await EditorialSectionItem.find({
      sectionId: { $in: sectionIds },
      status: 'active',
    })
      .sort({ isPinned: -1, sortOrder: 1, createdAt: 1 })
      .lean()

    const grouped = new Map<string, any[]>()
    for (const item of items) {
      if (!isVisibleInWindow(now, item.startAt, item.endAt)) {
        continue
      }
      const key = String(item.sectionId)
      const list = grouped.get(key) ?? []
      list.push(item)
      grouped.set(key, list)
    }

    return {
      items: sections.map((section) => ({
        id: String(section._id),
        key: section.key,
        title: section.title,
        subtitle: section.subtitle ?? null,
        description: section.description ?? null,
        sectionType: section.sectionType,
        order: section.order,
        maxItems: section.maxItems,
        items: (grouped.get(String(section._id)) ?? []).slice(0, section.maxItems).map(mapSectionItem),
      })),
    }
  }

  async listPublicVertical(vertical: DirectoryVerticalType, options: PublicDirectoryListOptions = {}) {
    if (!isValidDirectoryVerticalType(vertical)) {
      throw new AdminEditorialCmsServiceError(400, 'vertical invalido.')
    }

    if (
      options.verificationStatus &&
      !isValidDirectoryVerificationStatus(options.verificationStatus)
    ) {
      throw new AdminEditorialCmsServiceError(400, 'verificationStatus invalido.')
    }

    const showAll = options.showAll === true
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit
    const sort = options.sort ?? 'featured'

    const search = options.search?.trim()
    const country = options.country?.trim()
    const region = options.region?.trim()
    const categories = (options.categories ?? [])
      .map((category) => category.trim())
      .filter((category) => category.length > 0)
    const tags = (options.tags ?? [])
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    const query: Record<string, unknown> = {
      verticalType: vertical,
      status: 'published',
      isActive: true,
      showInDirectory: true,
      [showAll ? 'showAllEnabled' : 'landingEnabled']: true,
    }

    if (typeof options.isFeatured === 'boolean') {
      query.isFeatured = options.isFeatured
    }

    if (options.verificationStatus) {
      query.verificationStatus = options.verificationStatus
    }

    if (country) {
      query.country = new RegExp(`^${escapeRegExp(country)}$`, 'i')
    }

    if (region) {
      query.region = new RegExp(`^${escapeRegExp(region)}$`, 'i')
    }

    if (categories.length > 0) {
      query.categories = { $in: categories }
    }

    if (tags.length > 0) {
      query.tags = { $in: tags }
    }

    if (search && search.length > 0) {
      const regex = new RegExp(escapeRegExp(search), 'i')
      query.$or = [
        { name: regex },
        { slug: regex },
        { shortDescription: regex },
        { description: regex },
        { categories: regex },
        { tags: regex },
      ]
    }

    const sortBy: Record<string, 1 | -1> =
      sort === 'recent'
        ? { updatedAt: -1 }
        : sort === 'name'
          ? { name: 1 }
          : { isFeatured: -1, updatedAt: -1 }

    const [items, total] = await Promise.all([
      DirectoryEntry.find(query).sort(sortBy).skip(skip).limit(limit).lean(),
      DirectoryEntry.countDocuments(query),
    ])

    return {
      vertical,
      mode: showAll ? 'show-all' : 'landing',
      filters: {
        search: search ?? null,
        country: country ?? null,
        region: region ?? null,
        categories,
        tags,
        featured: typeof options.isFeatured === 'boolean' ? options.isFeatured : null,
        verificationStatus: options.verificationStatus ?? null,
        sort,
      },
      items: items.map(mapDirectory),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  private async loadOwnershipSnapshot(targetType: OwnershipEntityType, targetId: string) {
    if (targetType === 'directory_entry') {
      toObjectId(targetId, 'targetId')
      const entry = await DirectoryEntry.findById(targetId).lean()
      if (!entry) {
        throw new AdminEditorialCmsServiceError(404, 'DirectoryEntry alvo nao encontrado.')
      }
      return {
        fromOwnerType: entry.ownerType as OwnershipEntityOwnerType,
        fromOwnerUserId: entry.ownerUser ? String(entry.ownerUser) : null,
        metadata: {
          status: entry.status,
          claimable: entry.claimable,
        },
      }
    }

    if (!this.isContentType(targetType)) {
      throw new AdminEditorialCmsServiceError(400, 'targetType invalido.')
    }
    toObjectId(targetId, 'targetId')
    const model = contentModelByType[targetType]
    const item = await model.findById(targetId).lean()
    if (!item) {
      throw new AdminEditorialCmsServiceError(404, `Conteudo alvo (${targetType}) nao encontrado.`)
    }
    return {
      fromOwnerType: ((item.ownerType as ContentOwnerType | undefined) ?? 'creator_owned') as OwnershipEntityOwnerType,
      fromOwnerUserId: item.creator ? String(item.creator) : null,
      metadata: {
        status: item.status ?? null,
        claimable: Boolean(item.claimable),
      },
    }
  }

  private async applyOwnershipChange(input: {
    targetType: OwnershipEntityType
    targetId: string
    toOwnerType: OwnershipEntityOwnerType
    toOwnerUserId: string | null
    actorId: string
  }) {
    if (input.targetType === 'directory_entry') {
      const entry = await DirectoryEntry.findById(input.targetId)
      if (!entry) {
        throw new AdminEditorialCmsServiceError(404, 'DirectoryEntry alvo nao encontrado.')
      }
      entry.ownerType = input.toOwnerType
      entry.ownerUser = input.toOwnerUserId ? new mongoose.Types.ObjectId(input.toOwnerUserId) : null
      entry.claimable = input.toOwnerType !== 'creator_owned'
      entry.updatedBy = new mongoose.Types.ObjectId(input.actorId)
      await entry.save()
      return
    }

    if (!this.isContentType(input.targetType)) {
      throw new AdminEditorialCmsServiceError(400, 'targetType invalido.')
    }
    const model = contentModelByType[input.targetType]
    const content = await model.findById(input.targetId)
    if (!content) {
      throw new AdminEditorialCmsServiceError(404, `Conteudo alvo (${input.targetType}) nao encontrado.`)
    }

    content.ownerType = input.toOwnerType as ContentOwnerType
    content.claimable = input.toOwnerType !== 'creator_owned'
    if (input.toOwnerUserId) {
      content.creator = new mongoose.Types.ObjectId(input.toOwnerUserId)
    }
    await content.save()
  }
}

export const adminEditorialCmsService = new AdminEditorialCmsService()
