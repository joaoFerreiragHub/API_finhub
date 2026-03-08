import { Model } from 'mongoose'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Course } from '../models/Course'
import { Follow } from '../models/Follow'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Video } from '../models/Video'

type FeedContentType = 'article' | 'course' | 'video' | 'live' | 'book' | 'podcast'
type FeedResponseContentType = Exclude<FeedContentType, 'live'> | 'event'

interface FeedOptions {
  page?: number
  limit?: number
  following?: boolean
}

interface FeedPagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface FeedItem {
  id: string
  type: 'content_published'
  content: {
    id: string
    type: FeedResponseContentType
    slug: string
    title: string
    description: string
    coverImage: string | null
    creator: string
    creatorId: string
    category: string
    tags: string[]
    viewCount: number
    likeCount: number
    favoriteCount: number
    shareCount: number
    averageRating: number
    ratingCount: number
    reviewCount: number
    commentCount: number
    commentsEnabled: boolean
    requiredRole: 'free' | 'premium'
    isPremium: boolean
    isFeatured: boolean
    status: 'published'
    isPublished: true
    publishedAt?: string
    createdAt: string
    updatedAt: string
  }
  creatorName: string
  creatorAvatar?: string
  createdAt: string
}

interface FeedResponse {
  items: FeedItem[]
  pagination: FeedPagination
  filters: {
    following: boolean
  }
}

interface RawCreatorProjection {
  _id?: unknown
  id?: string
  name?: string
  username?: string
  avatar?: string
}

interface RawContentProjection {
  _id?: unknown
  slug?: string
  title?: string
  description?: string
  coverImage?: string
  creator?: RawCreatorProjection | string
  category?: string
  tags?: string[]
  views?: number
  likes?: number
  favorites?: number
  commentsCount?: number
  averageRating?: number
  ratingsCount?: number
  isPremium?: boolean
  isFeatured?: boolean
  publishedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

const FEED_MODELS: Array<{ model: Model<any>; contentType: FeedContentType }> = [
  { model: Article, contentType: 'article' },
  { model: Course, contentType: 'course' },
  { model: Video, contentType: 'video' },
  { model: LiveEvent, contentType: 'live' },
  { model: Book, contentType: 'book' },
  { model: Podcast, contentType: 'podcast' },
]

const normalizePage = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_PAGE
  return Math.floor(value)
}

const normalizeLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(value), MAX_LIMIT)
}

const toIsoString = (value?: Date): string | null => {
  if (!value || Number.isNaN(value.getTime())) {
    return null
  }

  return value.toISOString()
}

const mapContentType = (type: FeedContentType): FeedResponseContentType =>
  type === 'live' ? 'event' : type

const extractCreator = (
  value: RawContentProjection['creator']
): { id: string; name: string; avatar?: string } => {
  if (typeof value === 'string') {
    return {
      id: value,
      name: 'Criador',
    }
  }

  if (!value || typeof value !== 'object') {
    return {
      id: '',
      name: 'Criador',
    }
  }

  const id = (value.id ?? (value._id !== undefined ? String(value._id) : '')) || ''
  const name = value.name || value.username || 'Criador'

  return {
    id,
    name,
    avatar: value.avatar,
  }
}

class FeedService {
  async getFeed(userId: string, options: FeedOptions = {}): Promise<FeedResponse> {
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const following = options.following !== false

    const followedCreatorIds = await this.resolveFollowedCreatorIds(userId)

    if (following && followedCreatorIds.length === 0) {
      return {
        items: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 1,
        },
        filters: {
          following,
        },
      }
    }

    const offset = (page - 1) * limit
    const perModelLimit = Math.max(offset + limit, 20)

    const baseMatch: Record<string, unknown> = {
      status: 'published',
      moderationStatus: { $nin: ['hidden', 'restricted'] },
    }

    if (following) {
      baseMatch.creator = { $in: followedCreatorIds }
    }

    const [modelTotals, modelItems] = await Promise.all([
      Promise.all(FEED_MODELS.map(({ model }) => model.countDocuments(baseMatch))),
      Promise.all(
        FEED_MODELS.map(({ model, contentType }) =>
          this.fetchModelItems(model, contentType, baseMatch, perModelLimit)
        )
      ),
    ])

    const merged = modelItems
      .flat()
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

    const total = modelTotals.reduce((acc, value) => acc + value, 0)
    const items = merged.slice(offset, offset + limit)

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: {
        following,
      },
    }
  }

  private async resolveFollowedCreatorIds(userId: string): Promise<string[]> {
    const follows = await Follow.find({ follower: userId })
      .select('following')
      .lean<Array<{ following: unknown }>>()

    return follows.map((item) => String(item.following)).filter((id) => id.length > 0)
  }

  private async fetchModelItems(
    model: Model<any>,
    contentType: FeedContentType,
    match: Record<string, unknown>,
    limit: number,
  ): Promise<FeedItem[]> {
    const rows = await model
      .find(match)
      .select(
        'slug title description coverImage creator category tags views likes favorites commentsCount averageRating ratingsCount isPremium isFeatured publishedAt createdAt updatedAt',
      )
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .populate('creator', 'name username avatar')
      .lean<RawContentProjection[]>()

    return rows.map((row) => this.mapRow(row, contentType))
  }

  private mapRow(row: RawContentProjection, contentType: FeedContentType): FeedItem {
    const rawId = row._id !== undefined ? String(row._id) : ''
    const creator = extractCreator(row.creator)
    const publishedAt = toIsoString(row.publishedAt)
    const createdAtFallback = toIsoString(row.createdAt) ?? new Date().toISOString()
    const createdAt = publishedAt || createdAtFallback
    const updatedAt = toIsoString(row.updatedAt) ?? createdAt

    return {
      id: `${contentType}:${rawId}`,
      type: 'content_published',
      content: {
        id: rawId,
        type: mapContentType(contentType),
        slug: row.slug || rawId,
        title: row.title || 'Sem titulo',
        description: row.description || '',
        coverImage: row.coverImage || null,
        creator: creator.id,
        creatorId: creator.id,
        category: row.category || 'other',
        tags: Array.isArray(row.tags) ? row.tags : [],
        viewCount: Number(row.views || 0),
        likeCount: Number(row.likes || 0),
        favoriteCount: Number(row.favorites || 0),
        shareCount: 0,
        averageRating: Number(row.averageRating || 0),
        ratingCount: Number(row.ratingsCount || 0),
        reviewCount: Number(row.ratingsCount || 0),
        commentCount: Number(row.commentsCount || 0),
        commentsEnabled: true,
        requiredRole: row.isPremium ? 'premium' : 'free',
        isPremium: Boolean(row.isPremium),
        isFeatured: Boolean(row.isFeatured),
        status: 'published',
        isPublished: true,
        publishedAt: publishedAt || undefined,
        createdAt,
        updatedAt,
      },
      creatorName: creator.name,
      creatorAvatar: creator.avatar,
      createdAt,
    }
  }
}

export const feedService = new FeedService()
