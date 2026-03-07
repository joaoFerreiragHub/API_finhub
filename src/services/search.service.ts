import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Brand } from '../models/Brand'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { User } from '../models/User'
import { Video } from '../models/Video'

export type SearchEntityType =
  | 'article'
  | 'course'
  | 'video'
  | 'event'
  | 'book'
  | 'podcast'
  | 'creator'
  | 'brand'

type ContentSearchType = Exclude<SearchEntityType, 'creator' | 'brand'>

interface SearchResult {
  id: string
  type: SearchEntityType
  title: string
  description: string
  coverImage: string | null
  url: string
  score: number
}

interface RankedSearchResult extends SearchResult {
  sortTimestamp: number
}

interface SearchOptions {
  limit?: number
  types?: string[]
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
}

interface ContentProjection {
  _id: unknown
  title?: string
  slug?: string
  description?: string
  coverImage?: string | null
  views?: number
  averageRating?: number
  publishedAt?: Date | null
  createdAt?: Date | null
}

interface CreatorProjection {
  _id: unknown
  username?: string
  name?: string
  bio?: string
  avatar?: string | null
  followers?: number
  createdAt?: Date | null
}

interface BrandProjection {
  _id: unknown
  name?: string
  slug?: string
  description?: string
  logo?: string | null
  coverImage?: string | null
  views?: number
  averageRating?: number
  createdAt?: Date | null
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MIN_QUERY_LENGTH = 2

const ALL_SEARCH_TYPES: SearchEntityType[] = [
  'article',
  'course',
  'video',
  'event',
  'book',
  'podcast',
  'creator',
  'brand',
]

const TYPE_ALIASES: Record<string, SearchEntityType> = {
  article: 'article',
  articles: 'article',
  course: 'course',
  courses: 'course',
  video: 'video',
  videos: 'video',
  event: 'event',
  events: 'event',
  live: 'event',
  lives: 'event',
  book: 'book',
  books: 'book',
  podcast: 'podcast',
  podcasts: 'podcast',
  creator: 'creator',
  creators: 'creator',
  brand: 'brand',
  brands: 'brand',
}

const CONTENT_PATHS: Record<ContentSearchType, string> = {
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
    return DEFAULT_LIMIT
  }

  return Math.min(Math.floor(value), MAX_LIMIT)
}

const toTimestamp = (value?: Date | null): number => {
  if (!value) return 0
  const timestamp = value.getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const roundScore = (score: number): number => Math.round(score * 100) / 100

class SearchService {
  async search(queryRaw: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const query = queryRaw.trim()
    if (query.length < MIN_QUERY_LENGTH) {
      return {
        results: [],
        total: 0,
        query,
      }
    }

    const limit = normalizeLimit(options.limit)
    const types = this.resolveSearchTypes(options.types)
    const perTypeLimit = Math.min(Math.max(limit, 8), 25)

    const escapedQuery = escapeRegExp(query)
    const regex = new RegExp(escapedQuery, 'i')
    const normalizedQuery = query.toLowerCase()

    const tasks: Array<Promise<RankedSearchResult[]>> = []

    for (const type of types) {
      if (type === 'creator') {
        tasks.push(this.searchCreators(regex, normalizedQuery, perTypeLimit))
        continue
      }

      if (type === 'brand') {
        tasks.push(this.searchBrands(regex, normalizedQuery, perTypeLimit))
        continue
      }

      tasks.push(this.searchContent(type, regex, normalizedQuery, perTypeLimit))
    }

    const groupedResults = await Promise.all(tasks)
    const mergedResults = groupedResults.flat()

    mergedResults.sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }

      if (left.sortTimestamp !== right.sortTimestamp) {
        return right.sortTimestamp - left.sortTimestamp
      }

      return left.title.localeCompare(right.title)
    })

    const results = mergedResults.slice(0, limit).map(({ sortTimestamp: _sortTimestamp, ...item }) => item)

    return {
      results,
      total: mergedResults.length,
      query,
    }
  }

  private resolveSearchTypes(rawTypes?: string[]): SearchEntityType[] {
    if (!rawTypes || rawTypes.length === 0) {
      return [...ALL_SEARCH_TYPES]
    }

    const normalized = rawTypes
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
      .map((item) => TYPE_ALIASES[item])
      .filter((item): item is SearchEntityType => item !== undefined)

    if (normalized.length === 0) {
      return [...ALL_SEARCH_TYPES]
    }

    return Array.from(new Set(normalized))
  }

  private async searchContent(
    type: ContentSearchType,
    regex: RegExp,
    normalizedQuery: string,
    limit: number,
  ): Promise<RankedSearchResult[]> {
    const query = {
      status: 'published',
      moderationStatus: { $nin: ['hidden', 'restricted'] },
      $or: [{ title: regex }, { description: regex }],
    }

    let items: ContentProjection[] = []

    if (type === 'article') {
      items = await Article.find(query)
        .select('title slug description coverImage views averageRating publishedAt createdAt')
        .sort({ publishedAt: -1, views: -1 })
        .limit(limit)
        .lean<ContentProjection[]>()
    } else if (type === 'course') {
      items = await Course.find(query)
        .select('title slug description coverImage views averageRating publishedAt createdAt')
        .sort({ publishedAt: -1, views: -1 })
        .limit(limit)
        .lean<ContentProjection[]>()
    } else if (type === 'video') {
      items = await Video.find(query)
        .select('title slug description coverImage views averageRating publishedAt createdAt')
        .sort({ publishedAt: -1, views: -1 })
        .limit(limit)
        .lean<ContentProjection[]>()
    } else if (type === 'event') {
      items = await LiveEvent.find(query)
        .select('title slug description coverImage views averageRating publishedAt createdAt')
        .sort({ publishedAt: -1, views: -1 })
        .limit(limit)
        .lean<ContentProjection[]>()
    } else if (type === 'book') {
      items = await Book.find(query)
        .select('title slug description coverImage views averageRating publishedAt createdAt')
        .sort({ publishedAt: -1, views: -1 })
        .limit(limit)
        .lean<ContentProjection[]>()
    } else {
      items = await Podcast.find(query)
        .select('title slug description coverImage views averageRating publishedAt createdAt')
        .sort({ publishedAt: -1, views: -1 })
        .limit(limit)
        .lean<ContentProjection[]>()
    }

    return items.map((item) => {
      const id = String(item._id)
      const slugOrId = item.slug || id
      const title = item.title?.trim() || 'Sem titulo'
      const description = item.description?.trim() || ''
      const score = this.computeScore({
        normalizedQuery,
        primaryText: title,
        secondaryText: description,
        popularity: Number(item.views ?? 0),
        quality: Number(item.averageRating ?? 0),
      })

      return {
        id,
        type,
        title,
        description,
        coverImage: item.coverImage ?? null,
        url: `/hub/${CONTENT_PATHS[type]}/${slugOrId}`,
        score,
        sortTimestamp: toTimestamp(item.publishedAt) || toTimestamp(item.createdAt),
      }
    })
  }

  private async searchCreators(
    regex: RegExp,
    normalizedQuery: string,
    limit: number,
  ): Promise<RankedSearchResult[]> {
    const creators = await User.find({
      role: 'creator',
      accountStatus: 'active',
      $or: [{ name: regex }, { username: regex }, { bio: regex }],
    })
      .select('name username bio avatar followers createdAt')
      .sort({ followers: -1, createdAt: -1 })
      .limit(limit)
      .lean<CreatorProjection[]>()

    return creators.map((creator) => {
      const id = String(creator._id)
      const username = creator.username?.trim() || id
      const title = creator.name?.trim() || username
      const description = creator.bio?.trim() || `Criador @${username}`
      const score = this.computeScore({
        normalizedQuery,
        primaryText: `${title} ${username}`,
        secondaryText: description,
        popularity: Number(creator.followers ?? 0),
        quality: 0,
      })

      return {
        id,
        type: 'creator',
        title,
        description,
        coverImage: creator.avatar ?? null,
        url: `/creators/${encodeURIComponent(username)}`,
        score,
        sortTimestamp: toTimestamp(creator.createdAt),
      }
    })
  }

  private async searchBrands(
    regex: RegExp,
    normalizedQuery: string,
    limit: number,
  ): Promise<RankedSearchResult[]> {
    const brands = await Brand.find({
      isActive: true,
      $or: [{ name: regex }, { description: regex }, { category: regex }],
    })
      .select('name slug description logo coverImage views averageRating createdAt')
      .sort({ isFeatured: -1, views: -1, averageRating: -1 })
      .limit(limit)
      .lean<BrandProjection[]>()

    return brands.map((brand) => {
      const id = String(brand._id)
      const slugOrId = brand.slug?.trim() || id
      const title = brand.name?.trim() || 'Recurso'
      const description = brand.description?.trim() || 'Recurso financeiro'
      const score = this.computeScore({
        normalizedQuery,
        primaryText: title,
        secondaryText: description,
        popularity: Number(brand.views ?? 0),
        quality: Number(brand.averageRating ?? 0),
      })

      return {
        id,
        type: 'brand',
        title,
        description,
        coverImage: brand.logo ?? brand.coverImage ?? null,
        url: `/recursos/${slugOrId}`,
        score,
        sortTimestamp: toTimestamp(brand.createdAt),
      }
    })
  }

  private computeScore(input: {
    normalizedQuery: string
    primaryText: string
    secondaryText: string
    popularity: number
    quality: number
  }): number {
    const primary = input.primaryText.toLowerCase()
    const secondary = input.secondaryText.toLowerCase()

    let score = 0

    if (primary === input.normalizedQuery) {
      score += 60
    } else if (primary.startsWith(input.normalizedQuery)) {
      score += 30
    } else if (primary.includes(input.normalizedQuery)) {
      score += 18
    }

    if (secondary.includes(input.normalizedQuery)) {
      score += 8
    }

    score += Math.min(Math.log10(Math.max(1, input.popularity + 1)) * 3, 6)
    score += Math.min(Math.max(0, input.quality), 5)

    return roundScore(score)
  }
}

export const searchService = new SearchService()
