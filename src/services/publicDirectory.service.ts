import { FilterQuery } from 'mongoose'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Course } from '../models/Course'
import {
  DIRECTORY_VERTICAL_TYPES,
  DirectoryEntry,
  DirectoryVerticalType,
  DirectoryVerificationStatus,
  IDirectoryEntry,
} from '../models/DirectoryEntry'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Video } from '../models/Video'
import { resolvePagination } from '../utils/pagination'

export type DirectorySortBy = 'featured' | 'popular' | 'rating' | 'recent' | 'name'
type RelatedContentType = 'article' | 'course' | 'video' | 'event' | 'book' | 'podcast'

interface RelatedContentProjection {
  _id: unknown
  title?: string
  slug?: string
  description?: string
  coverImage?: string | null
  views?: number
  averageRating?: number
  isFeatured?: boolean
  category?: string
  tags?: string[]
  publishedAt?: Date | null
  createdAt?: Date | null
}

interface RelatedContentItem {
  id: string
  type: RelatedContentType
  title: string
  slug: string
  description: string
  coverImage: string | null
  url: string
  category: string | null
  tags: string[]
  views: number
  averageRating: number
  publishedAt: Date | null
  score: number
}

export interface PublicDirectoryFilters {
  verticalType?: DirectoryVerticalType
  country?: string
  verificationStatus?: DirectoryVerificationStatus
  search?: string
  isFeatured?: boolean
  tags?: string[]
}

export interface PublicDirectoryListOptions {
  page?: number
  limit?: number
  sort?: DirectorySortBy
}

export const DIRECTORY_VERIFICATION_STATUSES: ReadonlyArray<DirectoryVerificationStatus> = [
  'unverified',
  'pending',
  'verified',
]

export const DIRECTORY_SORT_OPTIONS: ReadonlyArray<DirectorySortBy> = [
  'featured',
  'popular',
  'rating',
  'recent',
  'name',
]

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const DEFAULT_FEATURED_LIMIT = 10
const DEFAULT_RELATED_CONTENT_LIMIT = 12
const MAX_RELATED_CONTENT_LIMIT = 30
const RELATED_CONTENT_TYPES: ReadonlyArray<RelatedContentType> = [
  'article',
  'course',
  'video',
  'event',
  'book',
  'podcast',
]
const RELATED_CONTENT_PATHS: Record<RelatedContentType, string> = {
  article: 'articles',
  course: 'courses',
  video: 'videos',
  event: 'lives',
  book: 'books',
  podcast: 'podcasts',
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_FEATURED_LIMIT
  }
  return Math.min(Math.floor(value), MAX_LIMIT)
}

const normalizeRelatedContentLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_RELATED_CONTENT_LIMIT
  }
  return Math.min(Math.floor(value), MAX_RELATED_CONTENT_LIMIT)
}

const toTimestamp = (value?: Date | null): number => {
  if (!value) return 0
  const timestamp = value.getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const splitIntoTerms = (value: string): string[] => {
  return value
    .split(/\s+/)
    .map((item) => item.trim().toLowerCase().replace(/[^a-z0-9-]+/gi, ''))
    .filter((item) => item.length >= 3)
}

const buildRelatedTerms = (entry: {
  name?: string
  tags?: string[]
  categories?: string[]
  regulatedBy?: string[]
  keyFeatures?: string[]
}): string[] => {
  const set = new Set<string>()
  const add = (value?: string | null) => {
    if (typeof value !== 'string') return
    const normalized = value.trim().toLowerCase()
    if (normalized.length < 3) return
    set.add(normalized)
    for (const token of splitIntoTerms(normalized)) {
      set.add(token)
    }
  }

  add(entry.name)
  for (const item of entry.tags ?? []) add(item)
  for (const item of entry.categories ?? []) add(item)
  for (const item of entry.regulatedBy ?? []) add(item)
  for (const item of entry.keyFeatures ?? []) add(item)

  return Array.from(set).slice(0, 16)
}

const computeRelatedScore = (
  item: RelatedContentProjection,
  entryNameLower: string,
  terms: string[]
): number => {
  const title = (item.title ?? '').toLowerCase()
  const description = (item.description ?? '').toLowerCase()

  let score = 0

  if (entryNameLower.length >= 3 && title.includes(entryNameLower)) score += 70
  if (entryNameLower.length >= 3 && description.includes(entryNameLower)) score += 30

  for (const term of terms) {
    if (term.length < 3) continue
    if (title.includes(term)) score += 8
    if (description.includes(term)) score += 4
  }

  score += Math.min(Number(item.views ?? 0) / 500, 20)
  score += Math.min(Number(item.averageRating ?? 0), 5) * 2
  if (item.isFeatured) score += 5

  return Math.round(score * 100) / 100
}

const normalizeTags = (tags?: string[]): string[] => {
  if (!tags || tags.length === 0) return []
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

const normalizeSearch = (search?: string): string | null => {
  if (typeof search !== 'string') return null
  const normalized = search.trim()
  return normalized.length > 0 ? normalized : null
}

const normalizeCountry = (country?: string): string | null => {
  if (typeof country !== 'string') return null
  const normalized = country.trim()
  return normalized.length > 0 ? normalized : null
}

const normalizeSort = (sort?: DirectorySortBy): DirectorySortBy => {
  if (sort && DIRECTORY_SORT_OPTIONS.includes(sort)) return sort
  return 'featured'
}

const resolveSort = (sort: DirectorySortBy): Record<string, 1 | -1> => {
  if (sort === 'popular') {
    return { views: -1, isFeatured: -1, averageRating: -1, updatedAt: -1 }
  }

  if (sort === 'rating') {
    return { averageRating: -1, ratingsCount: -1, views: -1, updatedAt: -1 }
  }

  if (sort === 'recent') {
    return { publishedAt: -1, updatedAt: -1 }
  }

  if (sort === 'name') {
    return { name: 1 }
  }

  return { isFeatured: -1, averageRating: -1, views: -1, updatedAt: -1 }
}

const mapPublicDirectory = (entry: any) => ({
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
  regulatedBy: Array.isArray(entry.regulatedBy) ? entry.regulatedBy : [],
  licenses: Array.isArray(entry.licenses) ? entry.licenses : [],
  pros: Array.isArray(entry.pros) ? entry.pros : [],
  cons: Array.isArray(entry.cons) ? entry.cons : [],
  keyFeatures: Array.isArray(entry.keyFeatures) ? entry.keyFeatures : [],
  pricing: entry.pricing ?? null,
  categories: Array.isArray(entry.categories) ? entry.categories : [],
  tags: Array.isArray(entry.tags) ? entry.tags : [],
  socialLinks: entry.socialLinks ?? null,
  verificationStatus: entry.verificationStatus,
  isFeatured: Boolean(entry.isFeatured),
  views: Number(entry.views ?? 0),
  averageRating: Number(entry.averageRating ?? 0),
  ratingsCount: Number(entry.ratingsCount ?? 0),
  commentsCount: Number(entry.commentsCount ?? 0),
  publishedAt: entry.publishedAt ?? null,
  updatedAt: entry.updatedAt ?? null,
})

const buildBaseDirectoryQuery = (
  filters: PublicDirectoryFilters
): {
  query: FilterQuery<IDirectoryEntry>
  normalized: {
    verticalType: DirectoryVerticalType | null
    country: string | null
    verificationStatus: DirectoryVerificationStatus | null
    search: string | null
    isFeatured: boolean | null
    tags: string[]
  }
} => {
  const verticalType = filters.verticalType ?? null
  const country = normalizeCountry(filters.country)
  const search = normalizeSearch(filters.search)
  const tags = normalizeTags(filters.tags)
  const verificationStatus = filters.verificationStatus ?? null

  const query: FilterQuery<IDirectoryEntry> = {
    status: 'published',
    isActive: true,
    showInDirectory: true,
  }

  if (verticalType) {
    query.verticalType = verticalType
  }

  if (country) {
    query.country = new RegExp(`^${escapeRegExp(country)}$`, 'i')
  }

  if (verificationStatus) {
    query.verificationStatus = verificationStatus
  }

  if (typeof filters.isFeatured === 'boolean') {
    query.isFeatured = filters.isFeatured
  }

  if (tags.length > 0) {
    query.tags = { $in: tags }
  }

  if (search) {
    const regex = new RegExp(escapeRegExp(search), 'i')
    query.$or = [
      { name: regex },
      { slug: regex },
      { shortDescription: regex },
      { description: regex },
      { regulatedBy: regex },
      { licenses: regex },
      { pros: regex },
      { cons: regex },
      { keyFeatures: regex },
      { pricing: regex },
      { categories: regex },
      { tags: regex },
    ]
  }

  return {
    query,
    normalized: {
      verticalType,
      country,
      verificationStatus,
      search,
      isFeatured: typeof filters.isFeatured === 'boolean' ? filters.isFeatured : null,
      tags,
    },
  }
}

export class PublicDirectoryServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export const isValidDirectoryVerticalType = (value: unknown): value is DirectoryVerticalType =>
  typeof value === 'string' && DIRECTORY_VERTICAL_TYPES.includes(value as DirectoryVerticalType)

export const isValidDirectoryVerificationStatus = (
  value: unknown
): value is DirectoryVerificationStatus =>
  typeof value === 'string' &&
  DIRECTORY_VERIFICATION_STATUSES.includes(value as DirectoryVerificationStatus)

export const isValidDirectorySortBy = (value: unknown): value is DirectorySortBy =>
  typeof value === 'string' && DIRECTORY_SORT_OPTIONS.includes(value as DirectorySortBy)

export class PublicDirectoryService {
  private async fetchRelatedContentByType(
    type: RelatedContentType,
    regex: RegExp,
    perTypeLimit: number,
    entryNameLower: string,
    terms: string[]
  ): Promise<RelatedContentItem[]> {
    const query = {
      status: 'published',
      moderationStatus: { $nin: ['hidden', 'restricted'] },
      $or: [{ title: regex }, { description: regex }, { tags: regex }, { category: regex }],
    }

    const projection =
      'title slug description coverImage views averageRating isFeatured category tags publishedAt createdAt'

    let items: RelatedContentProjection[] = []

    if (type === 'article') {
      items = await Article.find(query)
        .select(projection)
        .sort({ publishedAt: -1, views: -1 })
        .limit(perTypeLimit)
        .lean<RelatedContentProjection[]>()
    } else if (type === 'course') {
      items = await Course.find(query)
        .select(projection)
        .sort({ publishedAt: -1, views: -1 })
        .limit(perTypeLimit)
        .lean<RelatedContentProjection[]>()
    } else if (type === 'video') {
      items = await Video.find(query)
        .select(projection)
        .sort({ publishedAt: -1, views: -1 })
        .limit(perTypeLimit)
        .lean<RelatedContentProjection[]>()
    } else if (type === 'event') {
      items = await LiveEvent.find(query)
        .select(projection)
        .sort({ publishedAt: -1, views: -1 })
        .limit(perTypeLimit)
        .lean<RelatedContentProjection[]>()
    } else if (type === 'book') {
      items = await Book.find(query)
        .select(projection)
        .sort({ publishedAt: -1, views: -1 })
        .limit(perTypeLimit)
        .lean<RelatedContentProjection[]>()
    } else {
      items = await Podcast.find(query)
        .select(projection)
        .sort({ publishedAt: -1, views: -1 })
        .limit(perTypeLimit)
        .lean<RelatedContentProjection[]>()
    }

    return items.map((item) => {
      const id = String(item._id)
      const slugOrId = item.slug?.trim() || id
      const title = item.title?.trim() || 'Sem titulo'
      const description = item.description?.trim() || ''

      return {
        id,
        type,
        title,
        slug: slugOrId,
        description,
        coverImage: item.coverImage ?? null,
        url: `/hub/${RELATED_CONTENT_PATHS[type]}/${slugOrId}`,
        category: typeof item.category === 'string' ? item.category : null,
        tags: Array.isArray(item.tags) ? item.tags : [],
        views: Number(item.views ?? 0),
        averageRating: Number(item.averageRating ?? 0),
        publishedAt: item.publishedAt ?? null,
        score: computeRelatedScore(item, entryNameLower, terms),
      }
    })
  }

  async listPublicDirectories(
    filters: PublicDirectoryFilters = {},
    options: PublicDirectoryListOptions = {}
  ) {
    const { page, limit, skip } = resolvePagination(
      {
        page: options.page,
        limit: options.limit,
      },
      {
        defaultLimit: DEFAULT_LIMIT,
        maxLimit: MAX_LIMIT,
      }
    )

    const sort = normalizeSort(options.sort)
    const { query, normalized } = buildBaseDirectoryQuery(filters)

    const [items, total] = await Promise.all([
      DirectoryEntry.find(query).sort(resolveSort(sort)).skip(skip).limit(limit).lean(),
      DirectoryEntry.countDocuments(query),
    ])

    return {
      items: items.map(mapPublicDirectory),
      filters: {
        verticalType: normalized.verticalType,
        country: normalized.country,
        verificationStatus: normalized.verificationStatus,
        search: normalized.search,
        featured: normalized.isFeatured,
        tags: normalized.tags,
        sort,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async listPublicDirectoriesByVertical(
    vertical: DirectoryVerticalType,
    filters: Omit<PublicDirectoryFilters, 'verticalType'> = {},
    options: PublicDirectoryListOptions = {}
  ) {
    if (!isValidDirectoryVerticalType(vertical)) {
      throw new PublicDirectoryServiceError(400, 'Parametro vertical invalido.')
    }

    const result = await this.listPublicDirectories(
      {
        ...filters,
        verticalType: vertical,
      },
      options
    )

    return {
      vertical,
      ...result,
    }
  }

  async getFeaturedPublicDirectories(limitRaw?: number) {
    const limit = normalizeLimit(limitRaw)

    const items = await DirectoryEntry.find({
      status: 'published',
      isActive: true,
      showInDirectory: true,
      isFeatured: true,
    })
      .sort({ averageRating: -1, views: -1, updatedAt: -1 })
      .limit(limit)
      .lean()

    return {
      items: items.map(mapPublicDirectory),
      limit,
      total: items.length,
    }
  }

  async searchPublicDirectories(
    queryRaw: string,
    filters: Omit<PublicDirectoryFilters, 'search'> = {},
    options: PublicDirectoryListOptions = {}
  ) {
    const query = queryRaw.trim()
    if (query.length < 2) {
      throw new PublicDirectoryServiceError(400, 'Parametro q invalido. Usa pelo menos 2 caracteres.')
    }

    const result = await this.listPublicDirectories(
      {
        ...filters,
        search: query,
      },
      options
    )

    return {
      query,
      ...result,
    }
  }

  async getRelatedPublicDirectoryContent(
    vertical: DirectoryVerticalType,
    slugRaw: string,
    limitRaw?: number
  ) {
    if (!isValidDirectoryVerticalType(vertical)) {
      throw new PublicDirectoryServiceError(400, 'Parametro vertical invalido.')
    }

    const slug = slugRaw.trim().toLowerCase()
    if (!slug) {
      throw new PublicDirectoryServiceError(400, 'Parametro slug invalido.')
    }

    const entry = await DirectoryEntry.findOne({
      verticalType: vertical,
      slug,
      status: 'published',
      isActive: true,
      showInDirectory: true,
    })
      .select('name slug verticalType tags categories regulatedBy keyFeatures')
      .lean()

    if (!entry) {
      throw new PublicDirectoryServiceError(404, 'Entrada de diretorio nao encontrada.')
    }

    const limit = normalizeRelatedContentLimit(limitRaw)
    const terms = buildRelatedTerms({
      name: entry.name,
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      categories: Array.isArray(entry.categories) ? entry.categories : [],
      regulatedBy: Array.isArray(entry.regulatedBy) ? entry.regulatedBy : [],
      keyFeatures: Array.isArray(entry.keyFeatures) ? entry.keyFeatures : [],
    })

    if (terms.length === 0) {
      return {
        directory: {
          id: String(entry._id),
          name: entry.name,
          slug: entry.slug,
          verticalType: entry.verticalType,
        },
        items: [],
        total: 0,
        limit,
      }
    }

    const regex = new RegExp(terms.map(escapeRegExp).join('|'), 'i')
    const perTypeLimit = Math.max(3, Math.ceil(limit / RELATED_CONTENT_TYPES.length) + 1)
    const entryNameLower = entry.name.trim().toLowerCase()

    const grouped = await Promise.all(
      RELATED_CONTENT_TYPES.map((type) =>
        this.fetchRelatedContentByType(type, regex, perTypeLimit, entryNameLower, terms)
      )
    )

    const items = grouped
      .flat()
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score
        const leftTs = toTimestamp(left.publishedAt)
        const rightTs = toTimestamp(right.publishedAt)
        if (leftTs !== rightTs) return rightTs - leftTs
        if (left.views !== right.views) return right.views - left.views
        return left.title.localeCompare(right.title)
      })
      .slice(0, limit)

    return {
      directory: {
        id: String(entry._id),
        name: entry.name,
        slug: entry.slug,
        verticalType: entry.verticalType,
      },
      items,
      total: items.length,
      limit,
    }
  }

  async getPublicDirectoryByVerticalAndSlug(vertical: DirectoryVerticalType, slugRaw: string) {
    if (!isValidDirectoryVerticalType(vertical)) {
      throw new PublicDirectoryServiceError(400, 'Parametro vertical invalido.')
    }

    const slug = slugRaw.trim().toLowerCase()
    if (!slug) {
      throw new PublicDirectoryServiceError(400, 'Parametro slug invalido.')
    }

    const entry = await DirectoryEntry.findOneAndUpdate(
      {
        verticalType: vertical,
        slug,
        status: 'published',
        isActive: true,
        showInDirectory: true,
      },
      {
        $inc: { views: 1 },
      },
      {
        new: true,
      }
    ).lean()

    if (!entry) {
      throw new PublicDirectoryServiceError(404, 'Entrada de diretorio nao encontrada.')
    }

    return {
      entry: mapPublicDirectory(entry),
    }
  }
}

export const publicDirectoryService = new PublicDirectoryService()
