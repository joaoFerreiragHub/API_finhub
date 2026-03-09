import { FilterQuery } from 'mongoose'
import {
  DIRECTORY_VERTICAL_TYPES,
  DirectoryEntry,
  DirectoryVerticalType,
  DirectoryVerificationStatus,
  IDirectoryEntry,
} from '../models/DirectoryEntry'
import { resolvePagination } from '../utils/pagination'

export type DirectorySortBy = 'featured' | 'popular' | 'rating' | 'recent' | 'name'

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

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_FEATURED_LIMIT
  }
  return Math.min(Math.floor(value), MAX_LIMIT)
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
