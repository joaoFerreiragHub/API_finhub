import { PipelineStage } from 'mongoose'
import { ICreatorCardConfig, User } from '../models/User'
import { Rating } from '../models/Rating'

export type CreatorListSortBy = 'followers' | 'rating' | 'newest' | 'recent'

export interface PublicCreatorListFilters {
  search?: string
  minFollowers?: number
  minRating?: number
  emailVerified?: boolean
}

export interface PublicCreatorListOptions {
  page?: number
  limit?: number
  sortBy?: CreatorListSortBy
  sortOrder?: 'asc' | 'desc'
}

export class PublicCreatorServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizePage = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_PAGE
  return Math.floor(value)
}

const normalizeLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(value), MAX_LIMIT)
}

const normalizeSortBy = (value?: CreatorListSortBy): CreatorListSortBy => {
  if (value === 'rating' || value === 'newest' || value === 'recent') return value
  return 'followers'
}

const normalizeSortOrder = (value?: 'asc' | 'desc'): 1 | -1 => (value === 'asc' ? 1 : -1)

const buildSortStage = (
  sortBy: CreatorListSortBy,
  sortOrder: 1 | -1
): Record<string, 1 | -1> => {
  if (sortBy === 'rating') {
    return {
      averageRating: sortOrder,
      ratingsCount: -1,
      followers: -1,
      createdAt: -1,
    }
  }

  if (sortBy === 'newest') {
    return {
      createdAt: sortOrder,
      followers: -1,
    }
  }

  if (sortBy === 'recent') {
    return {
      lastActiveAt: sortOrder,
      createdAt: -1,
    }
  }

  return {
    followers: sortOrder,
    createdAt: -1,
  }
}

export class PublicCreatorService {
  private mapPublicCreator(item: {
    _id: unknown
    name: string
    username: string
    avatar?: string
    welcomeVideoUrl?: string
    cardConfig?: ICreatorCardConfig
    bio?: string
    socialLinks?: {
      website?: string
      twitter?: string
      linkedin?: string
      instagram?: string
    }
    followers: number
    following: number
    emailVerified: boolean
    createdAt: Date
    lastActiveAt?: Date
    averageRating: number
    ratingsCount: number
  }) {
    return {
      id: String(item._id),
      name: item.name,
      username: item.username,
      avatar: item.avatar ?? null,
      welcomeVideoUrl: item.welcomeVideoUrl ?? null,
      cardConfig: item.cardConfig ?? undefined,
      welcomeVideo: item.welcomeVideoUrl ? [item.welcomeVideoUrl] : [],
      bio: item.bio ?? null,
      socialLinks: {
        website: item.socialLinks?.website ?? null,
        twitter: item.socialLinks?.twitter ?? null,
        linkedin: item.socialLinks?.linkedin ?? null,
        instagram: item.socialLinks?.instagram ?? null,
      },
      followers: Number(item.followers ?? 0),
      following: Number(item.following ?? 0),
      emailVerified: Boolean(item.emailVerified),
      rating: {
        average: Math.round(Number(item.averageRating ?? 0) * 10) / 10,
        count: Number(item.ratingsCount ?? 0),
      },
      createdAt: item.createdAt,
      lastActiveAt: item.lastActiveAt ?? null,
    }
  }

  async listPublicCreators(
    filters: PublicCreatorListFilters = {},
    options: PublicCreatorListOptions = {}
  ) {
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit
    const sortBy = normalizeSortBy(options.sortBy)
    const sortOrder = normalizeSortOrder(options.sortOrder)

    const matchStage: Record<string, unknown> = {
      role: 'creator',
      accountStatus: 'active',
    }

    if (typeof filters.emailVerified === 'boolean') {
      matchStage.emailVerified = filters.emailVerified
    }

    if (typeof filters.minFollowers === 'number' && Number.isFinite(filters.minFollowers)) {
      matchStage.followers = { $gte: Math.max(0, Math.floor(filters.minFollowers)) }
    }

    if (filters.search && filters.search.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegExp(filters.search.trim()), 'i')
      matchStage.$or = [{ name: searchRegex }, { username: searchRegex }, { bio: searchRegex }]
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'ratings',
          let: {
            creatorId: '$_id',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$targetType', 'creator'] },
                    { $eq: ['$targetId', '$$creatorId'] },
                    { $eq: ['$moderationStatus', 'visible'] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                ratingsCount: { $sum: 1 },
              },
            },
          ],
          as: 'creatorRating',
        },
      },
      {
        $addFields: {
          averageRating: {
            $ifNull: [{ $arrayElemAt: ['$creatorRating.averageRating', 0] }, 0],
          },
          ratingsCount: {
            $ifNull: [{ $arrayElemAt: ['$creatorRating.ratingsCount', 0] }, 0],
          },
        },
      },
    ]

    if (typeof filters.minRating === 'number' && Number.isFinite(filters.minRating)) {
      pipeline.push({
        $match: {
          averageRating: { $gte: Math.max(0, Math.min(5, filters.minRating)) },
        },
      })
    }

    pipeline.push(
      { $sort: buildSortStage(sortBy, sortOrder) },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                avatar: 1,
                welcomeVideoUrl: 1,
                cardConfig: 1,
                bio: 1,
                socialLinks: 1,
                followers: 1,
                following: 1,
                emailVerified: 1,
                createdAt: 1,
                lastActiveAt: 1,
                averageRating: 1,
                ratingsCount: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      }
    )

    const [result] = await User.aggregate<{
      items: Array<{
        _id: unknown
        name: string
        username: string
        avatar?: string
        welcomeVideoUrl?: string
        cardConfig?: ICreatorCardConfig
        bio?: string
        socialLinks?: {
          website?: string
          twitter?: string
          linkedin?: string
          instagram?: string
        }
        followers: number
        following: number
        emailVerified: boolean
        createdAt: Date
        lastActiveAt?: Date
        averageRating: number
        ratingsCount: number
      }>
      total: Array<{ count: number }>
    }>(pipeline)

    const items = result?.items ?? []
    const total = result?.total?.[0]?.count ?? 0

    return {
      items: items.map((item) => this.mapPublicCreator(item)),
      filters: {
        search: filters.search?.trim() || null,
        minFollowers:
          typeof filters.minFollowers === 'number' ? Math.max(0, Math.floor(filters.minFollowers)) : null,
        minRating:
          typeof filters.minRating === 'number'
            ? Math.round(Math.max(0, Math.min(5, filters.minRating)) * 10) / 10
            : null,
        emailVerified: typeof filters.emailVerified === 'boolean' ? filters.emailVerified : null,
        sortBy,
        sortOrder: sortOrder === 1 ? 'asc' : 'desc',
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getPublicCreatorByUsername(usernameRaw: string) {
    const normalizedUsername = usernameRaw.trim().toLowerCase()
    if (!normalizedUsername) {
      throw new PublicCreatorServiceError(400, 'Parametro username invalido.')
    }

    const creator = await User.findOne({
      role: 'creator',
      accountStatus: 'active',
      username: normalizedUsername,
    })
      .select(
        'name username avatar welcomeVideoUrl cardConfig bio socialLinks followers following emailVerified createdAt lastActiveAt'
      )
      .lean()

    if (!creator) {
      throw new PublicCreatorServiceError(404, 'Creator nao encontrado.')
    }

    const [ratingStats] = await Rating.aggregate<{
      averageRating: number
      ratingsCount: number
    }>([
      {
        $match: {
          targetType: 'creator',
          targetId: creator._id,
          moderationStatus: 'visible',
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          ratingsCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          averageRating: 1,
          ratingsCount: 1,
        },
      },
    ])

    return this.mapPublicCreator({
      _id: creator._id,
      name: creator.name,
      username: creator.username,
      avatar: creator.avatar ?? undefined,
      welcomeVideoUrl: creator.welcomeVideoUrl ?? undefined,
      cardConfig: creator.cardConfig ?? undefined,
      bio: creator.bio ?? undefined,
      socialLinks: creator.socialLinks ?? undefined,
      followers: Number(creator.followers ?? 0),
      following: Number(creator.following ?? 0),
      emailVerified: Boolean(creator.emailVerified),
      createdAt: creator.createdAt,
      lastActiveAt: creator.lastActiveAt ?? undefined,
      averageRating: Number(ratingStats?.averageRating ?? 0),
      ratingsCount: Number(ratingStats?.ratingsCount ?? 0),
    })
  }
}

export const publicCreatorService = new PublicCreatorService()
