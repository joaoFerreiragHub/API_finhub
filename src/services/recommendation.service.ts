import { Model } from 'mongoose'
import { Article } from '../models/Article'
import { Course } from '../models/Course'
import { UserPreferences } from '../models/UserPreferences'
import { Video } from '../models/Video'
import { normalizeTags } from '../utils/contentTags'

export type RecommendationContentType = 'article' | 'video' | 'course'

export interface RecommendationCreator {
  id: string
  name?: string
  username?: string
  avatar?: string
}

export interface RecommendationItem {
  id: string
  type: RecommendationContentType
  title: string
  slug: string
  coverImage: string | null
  creator: RecommendationCreator
  tags: string[]
  category: string
  views: number
  createdAt: string
  publishedAt?: string
}

export interface RecommendationResponse {
  items: RecommendationItem[]
  meta: {
    userId: string
    source: 'tag_affinity' | 'popular_fallback'
    limit: number
  }
}

interface RecommendationOptions {
  limit?: number
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
  coverImage?: string
  creator?: RawCreatorProjection | string
  tags?: string[]
  category?: string
  views?: number
  createdAt?: Date
  publishedAt?: Date
}

interface ScoredRecommendationItem extends RecommendationItem {
  score: number
}

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 24
const RECENT_CONTENT_DAYS = 30
const POPULAR_FALLBACK_DAYS = 7
const MIN_AFFINITY_SCORE = 0.5

const EXCLUDED_INTERACTION_TYPES = new Set([
  'content_viewed',
  'content_completed',
  'not_interested',
  'view',
  'view_complete',
])

const MODEL_REGISTRY: Record<RecommendationContentType, Model<any>> = {
  article: Article,
  video: Video,
  course: Course,
}

const MODEL_ORDER: RecommendationContentType[] = ['article', 'video', 'course']

const clampLimit = (limit?: number): number => {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT)
}

const getWindowStart = (days: number): Date => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

const toIso = (value?: Date): string | undefined => {
  if (!value || Number.isNaN(value.getTime())) return undefined
  return value.toISOString()
}

const buildTypeCaps = (limit: number): Record<RecommendationContentType, number> => ({
  article: Math.max(1, Math.ceil(limit * 0.4)),
  video: Math.max(1, Math.ceil(limit * 0.3)),
  course: Math.max(1, Math.ceil(limit * 0.3)),
})

const mapCreator = (value: RawContentProjection['creator']): RecommendationCreator => {
  if (!value || typeof value !== 'object') {
    return {
      id: typeof value === 'string' ? value : '',
    }
  }

  return {
    id: value.id || (value._id ? String(value._id) : ''),
    name: value.name,
    username: value.username,
    avatar: value.avatar,
  }
}

const mapToRecommendationItem = (
  type: RecommendationContentType,
  row: RawContentProjection,
  score: number
): ScoredRecommendationItem => {
  const id = row._id ? String(row._id) : ''
  const createdAtIso = toIso(row.createdAt) || new Date().toISOString()
  const publishedAtIso = toIso(row.publishedAt)
  const normalizedTags = normalizeTags(Array.isArray(row.tags) ? row.tags : [])

  return {
    id,
    type,
    title: row.title || 'Sem titulo',
    slug: row.slug || id,
    coverImage: row.coverImage || null,
    creator: mapCreator(row.creator),
    tags: normalizedTags,
    category: row.category || 'other',
    views: Number(row.views || 0),
    createdAt: createdAtIso,
    publishedAt: publishedAtIso,
    score,
  }
}

const sortScoredItems = (items: ScoredRecommendationItem[]): ScoredRecommendationItem[] =>
  [...items].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    const rightDate = Date.parse(right.publishedAt || right.createdAt)
    const leftDate = Date.parse(left.publishedAt || left.createdAt)
    return rightDate - leftDate
  })

const uniqueByTypeAndId = (items: ScoredRecommendationItem[]): ScoredRecommendationItem[] => {
  const seen = new Set<string>()
  const unique: ScoredRecommendationItem[] = []

  for (const item of items) {
    const key = `${item.type}:${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }

  return unique
}

const computeAffinityMap = (
  tagAffinities: Array<{ tag?: string; score?: number }> | undefined
): Map<string, number> => {
  const affinityMap = new Map<string, number>()
  if (!Array.isArray(tagAffinities)) {
    return affinityMap
  }

  for (const row of tagAffinities) {
    if (!row || typeof row.tag !== 'string') continue
    const [normalizedTag] = normalizeTags([row.tag])
    if (!normalizedTag) continue

    const score = Number(row.score || 0)
    if (!Number.isFinite(score)) continue

    affinityMap.set(normalizedTag, (affinityMap.get(normalizedTag) || 0) + score)
  }

  return affinityMap
}

const resolveExcludedContentIds = (
  interactionSignals: Array<{
    interactionType?: string
    targetType?: string
    targetId?: string
  }> | undefined
): Record<RecommendationContentType, string[]> => {
  const excluded: Record<RecommendationContentType, string[]> = {
    article: [],
    video: [],
    course: [],
  }

  if (!Array.isArray(interactionSignals)) {
    return excluded
  }

  for (const signal of interactionSignals) {
    if (!signal || typeof signal.targetType !== 'string' || typeof signal.targetId !== 'string') {
      continue
    }

    const targetType = signal.targetType.trim().toLowerCase()
    if (!MODEL_ORDER.includes(targetType as RecommendationContentType)) {
      continue
    }

    if (!EXCLUDED_INTERACTION_TYPES.has(String(signal.interactionType || '').trim())) {
      continue
    }

    excluded[targetType as RecommendationContentType].push(signal.targetId.trim())
  }

  return {
    article: Array.from(new Set(excluded.article.filter(Boolean))),
    video: Array.from(new Set(excluded.video.filter(Boolean))),
    course: Array.from(new Set(excluded.course.filter(Boolean))),
  }
}

const mixWithTypeCaps = (
  byType: Record<RecommendationContentType, ScoredRecommendationItem[]>,
  limit: number
): ScoredRecommendationItem[] => {
  const caps = buildTypeCaps(limit)
  const pickedCount: Record<RecommendationContentType, number> = {
    article: 0,
    video: 0,
    course: 0,
  }
  const queue: Record<RecommendationContentType, ScoredRecommendationItem[]> = {
    article: [...byType.article],
    video: [...byType.video],
    course: [...byType.course],
  }
  const picked: ScoredRecommendationItem[] = []

  let progressed = true
  while (picked.length < limit && progressed) {
    progressed = false

    for (const type of MODEL_ORDER) {
      if (picked.length >= limit) break
      if (pickedCount[type] >= caps[type]) continue
      const next = queue[type].shift()
      if (!next) continue

      picked.push(next)
      pickedCount[type] += 1
      progressed = true
    }
  }

  if (picked.length >= limit) {
    return picked.slice(0, limit)
  }

  const fallbackPool = sortScoredItems(MODEL_ORDER.flatMap((type) => queue[type]))
  const used = new Set(picked.map((item) => `${item.type}:${item.id}`))

  for (const candidate of fallbackPool) {
    if (picked.length >= limit) break

    const key = `${candidate.type}:${candidate.id}`
    if (used.has(key)) continue
    used.add(key)
    picked.push(candidate)
  }

  return picked.slice(0, limit)
}

class RecommendationService {
  private async fetchByAffinity(
    affinityMap: Map<string, number>,
    excludedIds: Record<RecommendationContentType, string[]>,
    limit: number
  ): Promise<Record<RecommendationContentType, ScoredRecommendationItem[]>> {
    const affinityTags = [...affinityMap.entries()]
      .filter(([, score]) => score > MIN_AFFINITY_SCORE)
      .sort((left, right) => right[1] - left[1])
      .map(([tag]) => tag)
      .slice(0, 10)

    if (affinityTags.length === 0) {
      return {
        article: [],
        video: [],
        course: [],
      }
    }

    const recentWindowStart = getWindowStart(RECENT_CONTENT_DAYS)
    const perTypeLimit = Math.max(limit * 3, 12)

    const entries = await Promise.all(
      MODEL_ORDER.map(async (type) => {
        const model = MODEL_REGISTRY[type]
        const query: Record<string, unknown> = {
          status: 'published',
          moderationStatus: { $nin: ['hidden', 'restricted'] },
          publishedAt: { $gte: recentWindowStart },
          tags: { $in: affinityTags },
        }

        const excluded = excludedIds[type]
        if (excluded.length > 0) {
          query._id = { $nin: excluded }
        }

        const rows = await model
          .find(query)
          .select('slug title coverImage creator tags category views createdAt publishedAt')
          .sort({ publishedAt: -1, views: -1 })
          .limit(perTypeLimit)
          .populate('creator', 'name username avatar')
          .lean<RawContentProjection[]>()

        const scored = rows.map((row) => {
          const tags = normalizeTags(Array.isArray(row.tags) ? row.tags : [])
          const affinityScore = tags.reduce((sum, tag) => sum + (affinityMap.get(tag) || 0), 0)
          return mapToRecommendationItem(type, row, affinityScore)
        })

        return [type, sortScoredItems(scored)] as const
      })
    )

    const byType: Record<RecommendationContentType, ScoredRecommendationItem[]> = {
      article: [],
      video: [],
      course: [],
    }

    for (const [type, rows] of entries) {
      byType[type] = rows
    }

    return byType
  }

  private async fetchPopular(
    excludedIds: Record<RecommendationContentType, string[]>,
    limit: number
  ): Promise<Record<RecommendationContentType, ScoredRecommendationItem[]>> {
    const windowStart = getWindowStart(POPULAR_FALLBACK_DAYS)
    const perTypeLimit = Math.max(limit * 2, 10)

    const entries = await Promise.all(
      MODEL_ORDER.map(async (type) => {
        const model = MODEL_REGISTRY[type]
        const query: Record<string, unknown> = {
          status: 'published',
          moderationStatus: { $nin: ['hidden', 'restricted'] },
          publishedAt: { $gte: windowStart },
        }

        const excluded = excludedIds[type]
        if (excluded.length > 0) {
          query._id = { $nin: excluded }
        }

        const rows = await model
          .find(query)
          .select('slug title coverImage creator tags category views createdAt publishedAt')
          .sort({ views: -1, publishedAt: -1 })
          .limit(perTypeLimit)
          .populate('creator', 'name username avatar')
          .lean<RawContentProjection[]>()

        const scored = rows.map((row) =>
          mapToRecommendationItem(type, row, Number(row.views || 0))
        )

        return [type, sortScoredItems(scored)] as const
      })
    )

    const byType: Record<RecommendationContentType, ScoredRecommendationItem[]> = {
      article: [],
      video: [],
      course: [],
    }

    for (const [type, rows] of entries) {
      byType[type] = rows
    }

    return byType
  }

  private fillWithPopularIfNeeded(
    base: ScoredRecommendationItem[],
    popularByType: Record<RecommendationContentType, ScoredRecommendationItem[]>,
    limit: number
  ): ScoredRecommendationItem[] {
    if (base.length >= limit) {
      return base.slice(0, limit)
    }

    const seen = new Set(base.map((item) => `${item.type}:${item.id}`))
    const fillCandidates = mixWithTypeCaps(popularByType, limit * 2)
    const merged = [...base]

    for (const candidate of fillCandidates) {
      if (merged.length >= limit) break

      const key = `${candidate.type}:${candidate.id}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(candidate)
    }

    return merged.slice(0, limit)
  }

  async getRecommendations(userId: string, options: RecommendationOptions = {}): Promise<RecommendationResponse> {
    const limit = clampLimit(options.limit)
    const preferences = await UserPreferences.findOne({ user: userId })
      .select('tagAffinities interactionSignals')
      .lean<{
        tagAffinities?: Array<{ tag?: string; score?: number }>
        interactionSignals?: Array<{ interactionType?: string; targetType?: string; targetId?: string }>
      } | null>()

    const affinityMap = computeAffinityMap(preferences?.tagAffinities)
    const excludedIds = resolveExcludedContentIds(preferences?.interactionSignals)

    if (affinityMap.size === 0) {
      const popularByType = await this.fetchPopular(excludedIds, limit)
      const mixedPopular = mixWithTypeCaps(popularByType, limit)

      return {
        items: uniqueByTypeAndId(mixedPopular).map(({ score: _score, ...item }) => item),
        meta: {
          userId,
          source: 'popular_fallback',
          limit,
        },
      }
    }

    const byAffinity = await this.fetchByAffinity(affinityMap, excludedIds, limit)
    let mixed = mixWithTypeCaps(byAffinity, limit)

    if (mixed.length < limit) {
      const popularByType = await this.fetchPopular(excludedIds, limit)
      mixed = this.fillWithPopularIfNeeded(mixed, popularByType, limit)
    }

    const finalItems = uniqueByTypeAndId(mixed)

    if (finalItems.length === 0) {
      const popularByType = await this.fetchPopular(excludedIds, limit)
      const mixedPopular = mixWithTypeCaps(popularByType, limit)

      return {
        items: uniqueByTypeAndId(mixedPopular).map(({ score: _score, ...item }) => item),
        meta: {
          userId,
          source: 'popular_fallback',
          limit,
        },
      }
    }

    return {
      items: finalItems.slice(0, limit).map(({ score: _score, ...item }) => item),
      meta: {
        userId,
        source: 'tag_affinity',
        limit,
      },
    }
  }
}

export const recommendationService = new RecommendationService()
