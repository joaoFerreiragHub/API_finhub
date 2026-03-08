import mongoose from 'mongoose'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import {
  ContentAccessPolicy,
  ContentAccessPolicyAccess,
  ContentAccessPolicyCategory,
  ContentAccessPolicyContentType,
  ContentAccessPolicyHistoryChangeType,
  ContentAccessPolicyMatch,
  ContentAccessPolicyRequiredRole,
  IContentAccessPolicy,
} from '../models/ContentAccessPolicy'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Video } from '../models/Video'
import { resolvePagination } from '../utils/pagination'

interface CountModel {
  countDocuments(query: Record<string, unknown>): Promise<number>
  find(query: Record<string, unknown>): any
}

const modelByContentType: Record<ContentAccessPolicyContentType, CountModel> = {
  article: Article as unknown as CountModel,
  video: Video as unknown as CountModel,
  course: Course as unknown as CountModel,
  live: LiveEvent as unknown as CountModel,
  podcast: Podcast as unknown as CountModel,
  book: Book as unknown as CountModel,
}

const ALL_CONTENT_TYPES: ContentAccessPolicyContentType[] = [
  'article',
  'video',
  'course',
  'live',
  'podcast',
  'book',
]

const ALL_CATEGORIES: ContentAccessPolicyCategory[] = [
  'finance',
  'investing',
  'trading',
  'crypto',
  'economics',
  'personal-finance',
  'business',
  'technology',
  'education',
  'news',
  'analysis',
  'other',
]

const VALID_CONTENT_TYPE_SET = new Set<string>(ALL_CONTENT_TYPES)
const VALID_CATEGORY_SET = new Set<string>(ALL_CATEGORIES)
const VALID_REQUIRED_ROLE_SET = new Set<ContentAccessPolicyRequiredRole>(['free', 'premium'])
const CODE_PATTERN = /^[a-z0-9_.-]{3,64}$/
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const MAX_PRIORITY = 1000

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toBooleanOrUndefined = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined

const normalizeCode = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')

const normalizeStringArray = (value: unknown, maxItems: number, maxLength: number): string[] => {
  if (!Array.isArray(value)) return []
  const unique = new Set<string>()

  for (const item of value) {
    if (typeof item !== 'string') continue
    const normalized = item
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, maxLength)

    if (normalized.length > 0) unique.add(normalized)
  }

  return Array.from(unique).slice(0, maxItems)
}

const toPriority = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const parsed = Math.floor(value)
  if (parsed <= 0) return fallback
  return Math.min(parsed, MAX_PRIORITY)
}

const toDateOrNull = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

const mapActor = (
  value: unknown
): { id: string; name?: string; username?: string; email?: string; role?: string } | null => {
  if (!value || typeof value !== 'object') return null
  const actor = value as {
    _id?: unknown
    id?: unknown
    name?: unknown
    username?: unknown
    email?: unknown
    role?: unknown
  }

  const id =
    typeof actor._id === 'string'
      ? actor._id
      : actor._id instanceof mongoose.Types.ObjectId
        ? String(actor._id)
        : typeof actor.id === 'string'
          ? actor.id
          : null

  if (!id) return null
  return {
    id,
    name: typeof actor.name === 'string' ? actor.name : undefined,
    username: typeof actor.username === 'string' ? actor.username : undefined,
    email: typeof actor.email === 'string' ? actor.email : undefined,
    role: typeof actor.role === 'string' ? actor.role : undefined,
  }
}

const buildSnapshot = (policy: {
  label: string
  description?: string | null
  active: boolean
  priority: number
  effectiveFrom?: Date | null
  effectiveTo?: Date | null
  match: ContentAccessPolicyMatch
  access: ContentAccessPolicyAccess
}) => ({
  label: policy.label,
  description: policy.description ?? null,
  active: policy.active,
  priority: policy.priority,
  effectiveFrom: policy.effectiveFrom ?? null,
  effectiveTo: policy.effectiveTo ?? null,
  match: {
    contentTypes: policy.match.contentTypes,
    categories: policy.match.categories,
    tags: policy.match.tags,
    featuredOnly: policy.match.featuredOnly,
  },
  access: {
    requiredRole: policy.access.requiredRole,
    teaserAllowed: policy.access.teaserAllowed,
    blockedMessage: policy.access.blockedMessage ?? null,
  },
})

export class ContentAccessPolicyServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export interface ListContentAccessPoliciesFilters {
  active?: boolean
  requiredRole?: ContentAccessPolicyRequiredRole
  contentType?: ContentAccessPolicyContentType
  search?: string
}

export interface ContentAccessPolicyPayload {
  code?: string
  label?: string
  description?: string
  active?: boolean
  priority?: number
  effectiveFrom?: string | Date | null
  effectiveTo?: string | Date | null
  match?: {
    contentTypes?: unknown
    categories?: unknown
    tags?: unknown
    featuredOnly?: unknown
  }
  access?: {
    requiredRole?: unknown
    teaserAllowed?: unknown
    blockedMessage?: unknown
  }
  changeReason?: string
}

interface NormalizedPolicyPayload {
  code?: string
  label?: string
  description: string | null
  active?: boolean
  priority: number
  effectiveFrom: Date | null
  effectiveTo: Date | null
  match: ContentAccessPolicyMatch
  access: ContentAccessPolicyAccess
  changeReason: string
}

interface PreviewInput {
  match: ContentAccessPolicyMatch
  access: ContentAccessPolicyAccess
}

const sanitizeMatch = (
  input: ContentAccessPolicyPayload['match'] | undefined,
  fallback?: ContentAccessPolicyMatch
): ContentAccessPolicyMatch => {
  const contentTypesRaw = Array.isArray(input?.contentTypes)
    ? (input?.contentTypes as unknown[])
    : fallback?.contentTypes ?? ALL_CONTENT_TYPES
  const contentTypes = contentTypesRaw
    .filter((value): value is ContentAccessPolicyContentType => typeof value === 'string' && VALID_CONTENT_TYPE_SET.has(value))
    .slice(0, ALL_CONTENT_TYPES.length)
  const normalizedContentTypes = contentTypes.length > 0 ? contentTypes : ALL_CONTENT_TYPES

  const categoriesRaw = Array.isArray(input?.categories)
    ? (input?.categories as unknown[])
    : fallback?.categories ?? []
  const categories = categoriesRaw
    .filter((value): value is ContentAccessPolicyCategory => typeof value === 'string' && VALID_CATEGORY_SET.has(value))
    .slice(0, ALL_CATEGORIES.length)

  const tags = input?.tags !== undefined
    ? normalizeStringArray(input.tags, 15, 48)
    : fallback?.tags ?? []
  const featuredOnly =
    toBooleanOrUndefined(input?.featuredOnly) ?? fallback?.featuredOnly ?? false

  return {
    contentTypes: normalizedContentTypes,
    categories,
    tags,
    featuredOnly,
  }
}

const sanitizeAccess = (
  input: ContentAccessPolicyPayload['access'] | undefined,
  fallback?: ContentAccessPolicyAccess
): ContentAccessPolicyAccess => {
  const requiredRoleRaw = toStringOrNull(input?.requiredRole) ?? fallback?.requiredRole ?? 'premium'
  if (!VALID_REQUIRED_ROLE_SET.has(requiredRoleRaw as ContentAccessPolicyRequiredRole)) {
    throw new ContentAccessPolicyServiceError(
      400,
      "access.requiredRole invalido. Valores aceites: 'free' ou 'premium'."
    )
  }

  return {
    requiredRole: requiredRoleRaw as ContentAccessPolicyRequiredRole,
    teaserAllowed: toBooleanOrUndefined(input?.teaserAllowed) ?? fallback?.teaserAllowed ?? true,
    blockedMessage:
      input?.blockedMessage !== undefined
        ? toStringOrNull(input.blockedMessage)
        : fallback?.blockedMessage ?? null,
  }
}

const buildQueryFromMatch = (match: ContentAccessPolicyMatch): Record<string, unknown> => {
  const query: Record<string, unknown> = {
    status: 'published',
  }
  if (match.categories.length > 0) {
    query.category = { $in: match.categories }
  }
  if (match.tags.length > 0) {
    query.tags = { $in: match.tags }
  }
  if (match.featuredOnly) {
    query.isFeatured = true
  }
  return query
}

export class ContentAccessPolicyService {
  async listPolicies(
    filters: ListContentAccessPoliciesFilters = {},
    options: { page?: number; limit?: number } = {}
  ) {
    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const query: Record<string, unknown> = {}
    if (typeof filters.active === 'boolean') query.active = filters.active
    if (filters.requiredRole) query['access.requiredRole'] = filters.requiredRole
    if (filters.contentType) query['match.contentTypes'] = filters.contentType

    const search = toStringOrNull(filters.search)
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [{ code: { $regex: escaped, $options: 'i' } }, { label: { $regex: escaped, $options: 'i' } }]
    }

    const [rows, total] = await Promise.all([
      ContentAccessPolicy.find(query)
        .sort({ active: -1, priority: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name username email role')
        .populate('updatedBy', 'name username email role')
        .lean(),
      ContentAccessPolicy.countDocuments(query),
    ])

    return {
      items: rows.map((row) => this.mapPolicy(row as any)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getPolicy(policyId: string) {
    const policy = await this.findPolicy(policyId)
    return this.mapPolicy(policy.toObject())
  }

  async createPolicy(actorId: string, payload: ContentAccessPolicyPayload) {
    this.assertActor(actorId)

    const codeRaw = toStringOrNull(payload.code)
    const label = toStringOrNull(payload.label)
    if (!codeRaw || !label) {
      throw new ContentAccessPolicyServiceError(400, 'Campos obrigatorios: code, label.')
    }

    const code = normalizeCode(codeRaw)
    if (!CODE_PATTERN.test(code)) {
      throw new ContentAccessPolicyServiceError(400, 'Campo code invalido (3-64 chars, [a-z0-9_.-]).')
    }

    const exists = await ContentAccessPolicy.exists({ code })
    if (exists) {
      throw new ContentAccessPolicyServiceError(409, 'Ja existe uma policy com esse code.')
    }

    const normalized = this.normalizePayload(payload, undefined, true)
    const actorObjectId = new mongoose.Types.ObjectId(actorId)

    const policy = await ContentAccessPolicy.create({
      code,
      label,
      description: normalized.description,
      active: normalized.active ?? true,
      priority: normalized.priority,
      effectiveFrom: normalized.effectiveFrom,
      effectiveTo: normalized.effectiveTo,
      match: normalized.match,
      access: normalized.access,
      version: 1,
      createdBy: actorObjectId,
      updatedBy: actorObjectId,
      history: [
        {
          version: 1,
          changeType: 'created',
          changedAt: new Date(),
          changedBy: actorObjectId,
          changeReason: normalized.changeReason,
          snapshot: buildSnapshot({
            label,
            description: normalized.description,
            active: normalized.active ?? true,
            priority: normalized.priority,
            effectiveFrom: normalized.effectiveFrom,
            effectiveTo: normalized.effectiveTo,
            match: normalized.match,
            access: normalized.access,
          }),
        },
      ],
    })

    await policy.populate('createdBy', 'name username email role')
    await policy.populate('updatedBy', 'name username email role')

    return this.mapPolicy(policy.toObject())
  }

  async updatePolicy(actorId: string, policyId: string, payload: ContentAccessPolicyPayload) {
    this.assertActor(actorId)
    const policy = await this.findPolicy(policyId)
    const previousActive = policy.active
    const normalized = this.normalizePayload(payload, policy, false)

    if (payload.label !== undefined) {
      const label = toStringOrNull(payload.label)
      if (!label) {
        throw new ContentAccessPolicyServiceError(400, 'Campo label invalido.')
      }
      policy.label = label
    }

    if (payload.description !== undefined) {
      policy.description = normalized.description
    }

    if (payload.active !== undefined) {
      policy.active = normalized.active ?? policy.active
    }

    if (payload.priority !== undefined) {
      policy.priority = normalized.priority
    }

    if (payload.effectiveFrom !== undefined) {
      policy.effectiveFrom = normalized.effectiveFrom
    }

    if (payload.effectiveTo !== undefined) {
      policy.effectiveTo = normalized.effectiveTo
    }

    if (payload.match !== undefined) {
      policy.match = normalized.match
    }

    if (payload.access !== undefined) {
      policy.access = normalized.access
    }

    const hasChanges = policy.isModified()
    if (!hasChanges) {
      throw new ContentAccessPolicyServiceError(400, 'Sem alteracoes para aplicar na policy.')
    }

    policy.version += 1
    policy.updatedBy = new mongoose.Types.ObjectId(actorId)
    const changeType: ContentAccessPolicyHistoryChangeType =
      policy.active !== previousActive ? 'status_change' : 'updated'

    policy.history.push({
      version: policy.version,
      changeType,
      changedAt: new Date(),
      changedBy: new mongoose.Types.ObjectId(actorId),
      changeReason: normalized.changeReason,
      snapshot: buildSnapshot({
        label: policy.label,
        description: policy.description,
        active: policy.active,
        priority: policy.priority,
        effectiveFrom: policy.effectiveFrom,
        effectiveTo: policy.effectiveTo,
        match: policy.match,
        access: policy.access,
      }),
    })

    await policy.save()
    await policy.populate('createdBy', 'name username email role')
    await policy.populate('updatedBy', 'name username email role')

    return this.mapPolicy(policy.toObject())
  }

  async setPolicyActive(actorId: string, policyId: string, active: boolean, changeReason?: string) {
    return this.updatePolicy(actorId, policyId, {
      active,
      changeReason: toStringOrNull(changeReason) ?? (active ? 'policy_activated' : 'policy_deactivated'),
    })
  }

  async previewPolicy(payload: ContentAccessPolicyPayload) {
    const normalized = this.normalizePayload(payload, undefined, false)
    const previewInput: PreviewInput = {
      match: normalized.match,
      access: normalized.access,
    }

    const countsByType: Record<
      ContentAccessPolicyContentType,
      { total: number; currentlyPremium: number; currentlyFree: number }
    > = {
      article: { total: 0, currentlyPremium: 0, currentlyFree: 0 },
      video: { total: 0, currentlyPremium: 0, currentlyFree: 0 },
      course: { total: 0, currentlyPremium: 0, currentlyFree: 0 },
      live: { total: 0, currentlyPremium: 0, currentlyFree: 0 },
      podcast: { total: 0, currentlyPremium: 0, currentlyFree: 0 },
      book: { total: 0, currentlyPremium: 0, currentlyFree: 0 },
    }

    let totalMatches = 0
    let currentlyPremium = 0
    let currentlyFree = 0

    const sampleItems: Array<{
      id: string
      contentType: ContentAccessPolicyContentType
      title: string
      isPremium: boolean
      category?: string
      publishedAt: string | null
    }> = []

    const selectedTypes = previewInput.match.contentTypes
    await Promise.all(
      selectedTypes.map(async (contentType) => {
        const model = modelByContentType[contentType]
        const baseQuery = buildQueryFromMatch(previewInput.match)

        const [total, premiumCount, freeCount, samples] = await Promise.all([
          model.countDocuments(baseQuery),
          model.countDocuments({ ...baseQuery, isPremium: true }),
          model.countDocuments({ ...baseQuery, isPremium: false }),
          model
            .find(baseQuery)
            .select('_id title isPremium category publishedAt')
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(4)
            .lean(),
        ])

        countsByType[contentType] = {
          total,
          currentlyPremium: premiumCount,
          currentlyFree: freeCount,
        }

        totalMatches += total
        currentlyPremium += premiumCount
        currentlyFree += freeCount

        for (const sample of samples as Array<{
          _id?: unknown
          title?: unknown
          isPremium?: unknown
          category?: unknown
          publishedAt?: unknown
        }>) {
          const id =
            typeof sample._id === 'string'
              ? sample._id
              : sample._id instanceof mongoose.Types.ObjectId
                ? String(sample._id)
                : null
          if (!id) continue

          sampleItems.push({
            id,
            contentType,
            title: typeof sample.title === 'string' ? sample.title : '',
            isPremium: sample.isPremium === true,
            category: typeof sample.category === 'string' ? sample.category : undefined,
            publishedAt:
              sample.publishedAt instanceof Date
                ? sample.publishedAt.toISOString()
                : typeof sample.publishedAt === 'string'
                  ? sample.publishedAt
                  : null,
          })
        }
      })
    )

    return {
      input: {
        match: previewInput.match,
        access: previewInput.access,
      },
      impact: {
        totalMatches,
        currentlyPremium,
        currentlyFree,
        byContentType: countsByType,
      },
      sample: sampleItems
        .sort((left, right) => {
          const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0
          const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0
          return rightTime - leftTime
        })
        .slice(0, 12),
      generatedAt: new Date().toISOString(),
    }
  }

  private assertActor(actorId: string) {
    if (!mongoose.Types.ObjectId.isValid(actorId)) {
      throw new ContentAccessPolicyServiceError(400, 'actorId invalido.')
    }
  }

  private async findPolicy(policyIdRaw: string): Promise<IContentAccessPolicy> {
    if (!mongoose.Types.ObjectId.isValid(policyIdRaw)) {
      throw new ContentAccessPolicyServiceError(400, 'policyId invalido.')
    }

    const policy = await ContentAccessPolicy.findById(policyIdRaw)
      .populate('createdBy', 'name username email role')
      .populate('updatedBy', 'name username email role')

    if (!policy) {
      throw new ContentAccessPolicyServiceError(404, 'Policy de acesso nao encontrada.')
    }

    return policy
  }

  private normalizePayload(
    payload: ContentAccessPolicyPayload,
    current: IContentAccessPolicy | undefined,
    requireMandatoryFields: boolean
  ): NormalizedPolicyPayload {
    const description =
      payload.description !== undefined
        ? toStringOrNull(payload.description)
        : current?.description ?? null
    const active = payload.active !== undefined ? payload.active : current?.active
    const priority =
      payload.priority !== undefined ? toPriority(payload.priority, current?.priority ?? 100) : current?.priority ?? 100
    const effectiveFrom =
      payload.effectiveFrom !== undefined
        ? toDateOrNull(payload.effectiveFrom)
        : current?.effectiveFrom ?? null
    const effectiveTo =
      payload.effectiveTo !== undefined ? toDateOrNull(payload.effectiveTo) : current?.effectiveTo ?? null
    const match = sanitizeMatch(payload.match, current?.match)
    const access = sanitizeAccess(payload.access, current?.access)
    const changeReason = toStringOrNull(payload.changeReason) ?? 'policy_updated'

    if (requireMandatoryFields) {
      const code = toStringOrNull(payload.code)
      const label = toStringOrNull(payload.label)
      if (!code || !label) {
        throw new ContentAccessPolicyServiceError(400, 'Campos obrigatorios: code e label.')
      }
    }

    if (effectiveFrom && effectiveTo && effectiveFrom.getTime() > effectiveTo.getTime()) {
      throw new ContentAccessPolicyServiceError(
        400,
        'effectiveFrom nao pode ser superior a effectiveTo.'
      )
    }

    return {
      code: toStringOrNull(payload.code) ?? current?.code,
      label: toStringOrNull(payload.label) ?? current?.label,
      description,
      active,
      priority,
      effectiveFrom,
      effectiveTo,
      match,
      access,
      changeReason,
    }
  }

  private mapPolicy(policy: {
    _id?: unknown
    code?: unknown
    label?: unknown
    description?: unknown
    active?: unknown
    priority?: unknown
    effectiveFrom?: unknown
    effectiveTo?: unknown
    match?: unknown
    access?: unknown
    version?: unknown
    createdBy?: unknown
    updatedBy?: unknown
    history?: unknown
    createdAt?: unknown
    updatedAt?: unknown
  }) {
    const historyRows = Array.isArray(policy.history) ? policy.history : []

    return {
      id:
        policy._id instanceof mongoose.Types.ObjectId
          ? String(policy._id)
          : typeof policy._id === 'string'
            ? policy._id
            : null,
      code: typeof policy.code === 'string' ? policy.code : '',
      label: typeof policy.label === 'string' ? policy.label : '',
      description: typeof policy.description === 'string' ? policy.description : null,
      active: policy.active === true,
      priority: typeof policy.priority === 'number' ? policy.priority : 100,
      effectiveFrom:
        policy.effectiveFrom instanceof Date
          ? policy.effectiveFrom.toISOString()
          : typeof policy.effectiveFrom === 'string'
            ? policy.effectiveFrom
            : null,
      effectiveTo:
        policy.effectiveTo instanceof Date
          ? policy.effectiveTo.toISOString()
          : typeof policy.effectiveTo === 'string'
            ? policy.effectiveTo
            : null,
      match:
        policy.match && typeof policy.match === 'object'
          ? (policy.match as ContentAccessPolicyMatch)
          : {
              contentTypes: ALL_CONTENT_TYPES,
              categories: [],
              tags: [],
              featuredOnly: false,
            },
      access:
        policy.access && typeof policy.access === 'object'
          ? (policy.access as ContentAccessPolicyAccess)
          : {
              requiredRole: 'premium',
              teaserAllowed: true,
              blockedMessage: null,
            },
      version: typeof policy.version === 'number' ? policy.version : 1,
      createdBy: mapActor(policy.createdBy),
      updatedBy: mapActor(policy.updatedBy),
      historyCount: historyRows.length,
      lastHistoryEntry:
        historyRows.length > 0 && typeof historyRows[historyRows.length - 1] === 'object'
          ? historyRows[historyRows.length - 1]
          : null,
      createdAt:
        policy.createdAt instanceof Date
          ? policy.createdAt.toISOString()
          : typeof policy.createdAt === 'string'
            ? policy.createdAt
            : null,
      updatedAt:
        policy.updatedAt instanceof Date
          ? policy.updatedAt.toISOString()
          : typeof policy.updatedAt === 'string'
            ? policy.updatedAt
            : null,
    }
  }
}

export const contentAccessPolicyService = new ContentAccessPolicyService()
