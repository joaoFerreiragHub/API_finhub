import crypto from 'crypto'
import mongoose from 'mongoose'
import {
  BrandIntegrationApiKey,
  BrandIntegrationScope,
  BRAND_INTEGRATION_SCOPES,
} from '../models/BrandIntegrationApiKey'
import { BrandIntegrationApiUsage } from '../models/BrandIntegrationApiUsage'
import { DirectoryEntry } from '../models/DirectoryEntry'
import { resolvePagination } from '../utils/pagination'
import { affiliateTrackingService } from './affiliateTracking.service'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const KEY_PREFIX_BASE = 'fhub_bi_'
const KEY_PREFIX_ID_LENGTH = 14
const KEY_SECRET_LENGTH = 32
const KEY_PREFIX_REGEX = /^fhub_bi_[a-zA-Z0-9]{10,24}$/
const ALLOWED_SCOPE_SET = new Set<BrandIntegrationScope>(BRAND_INTEGRATION_SCOPES)
const API_USAGE_RETENTION_DAYS = (() => {
  const parsed = Number.parseInt(process.env.BRAND_INTEGRATION_API_USAGE_RETENTION_DAYS ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 7) return 120
  return Math.min(parsed, 365)
})()

export interface BrandIntegrationAuthContext {
  keyId: string
  keyPrefix: string
  ownerUserId: string
  directoryEntryId: string
  scopes: BrandIntegrationScope[]
  label: string | null
  expiresAt: string | null
}

export interface BrandIntegrationKeyListFilters {
  directoryEntryId?: string
  isActive?: boolean
}

export interface BrandIntegrationKeyListOptions {
  page?: number
  limit?: number
}

export interface BrandIntegrationUsageListFilters {
  days?: number
  method?: string
  statusCodeFrom?: number
  statusCodeTo?: number
}

export interface BrandIntegrationUsageListOptions {
  page?: number
  limit?: number
}

type ApiKeyLeanRow = {
  _id: mongoose.Types.ObjectId
  keyPrefix: string
  keyHash: string
  ownerUser: mongoose.Types.ObjectId
  directoryEntry: mongoose.Types.ObjectId
  label?: string | null
  scopes: BrandIntegrationScope[]
  isActive: boolean
  lastUsedAt?: Date | null
  expiresAt?: Date | null
  revokedAt?: Date | null
  revokedBy?: mongoose.Types.ObjectId | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

type ApiUsageLeanRow = {
  _id: mongoose.Types.ObjectId
  apiKey: mongoose.Types.ObjectId
  keyPrefix: string
  ownerUser: mongoose.Types.ObjectId
  directoryEntry: mongoose.Types.ObjectId
  scope: BrandIntegrationScope
  method: string
  path: string
  statusCode: number
  durationMs: number
  requestId?: string | null
  ipHash?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

const toIsoOrNull = (value: Date | null | undefined): string | null =>
  value instanceof Date ? value.toISOString() : null

const normalizeOptionalString = (value: unknown, maxLength = 160): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

const normalizeMetadata = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const toDateOrNull = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

const normalizeApiKey = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized || normalized.length < 24 || normalized.length > 120) return null
  return normalized
}

const hashApiKey = (rawKey: string): string =>
  crypto.createHash('sha256').update(rawKey).digest('hex')

const toIpHash = (ipValue: unknown): string | null => {
  const normalized = normalizeOptionalString(ipValue, 200)
  if (!normalized) return null
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

const normalizeMethod = (value: unknown): string => {
  if (typeof value !== 'string') return 'GET'
  const normalized = value.trim().toUpperCase()
  if (!normalized) return 'GET'
  return normalized.slice(0, 10)
}

const clampToNumberRange = (value: unknown, min: number, max: number, fallback: number): number => {
  const asNumber =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN
  if (!Number.isFinite(asNumber)) return fallback
  return Math.min(max, Math.max(min, Math.floor(asNumber)))
}

const randomAlphanumeric = (bytes: number, length: number): string =>
  crypto
    .randomBytes(bytes)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, length)

const normalizeScopeList = (value: unknown): BrandIntegrationScope[] | null => {
  if (value === null || value === undefined) return ['brand.affiliate.read']
  if (!Array.isArray(value)) return null

  const deduped = new Set<BrandIntegrationScope>()
  for (const item of value) {
    if (typeof item !== 'string' || !ALLOWED_SCOPE_SET.has(item as BrandIntegrationScope)) {
      return null
    }
    deduped.add(item as BrandIntegrationScope)
  }

  if (deduped.size === 0) {
    deduped.add('brand.affiliate.read')
  }

  return Array.from(deduped)
}

export class BrandIntegrationApiKeyServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class BrandIntegrationApiKeyService {
  private toObjectId(value: string, fieldName: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new BrandIntegrationApiKeyServiceError(400, `${fieldName} invalido.`)
    }
    return new mongoose.Types.ObjectId(value)
  }

  private toOwnerObjectId(ownerUserId: string): mongoose.Types.ObjectId {
    return this.toObjectId(ownerUserId, 'ownerUserId')
  }

  private async assertOwnedDirectoryEntry(
    ownerObjectId: mongoose.Types.ObjectId,
    directoryEntryIdRaw: string
  ): Promise<mongoose.Types.ObjectId> {
    const directoryEntryId = this.toObjectId(directoryEntryIdRaw, 'directoryEntryId')
    const isOwned = await DirectoryEntry.exists({
      _id: directoryEntryId,
      ownerUser: ownerObjectId,
    })
    if (!isOwned) {
      throw new BrandIntegrationApiKeyServiceError(
        403,
        'Sem permissao para gerir API keys deste DirectoryEntry.'
      )
    }
    return directoryEntryId
  }

  private async findOwnedApiKey(
    ownerObjectId: mongoose.Types.ObjectId,
    keyIdRaw: string
  ): Promise<ApiKeyLeanRow> {
    const keyId = this.toObjectId(keyIdRaw, 'keyId')
    const key = await BrandIntegrationApiKey.findById(keyId).lean<ApiKeyLeanRow | null>()
    if (!key) {
      throw new BrandIntegrationApiKeyServiceError(404, 'API key de integracao nao encontrada.')
    }
    if (String(key.ownerUser) !== String(ownerObjectId)) {
      throw new BrandIntegrationApiKeyServiceError(403, 'Sem permissao para esta API key.')
    }
    return key
  }

  private mapKeyItem(row: ApiKeyLeanRow) {
    return {
      id: String(row._id),
      keyPrefix: row.keyPrefix,
      label: row.label ?? null,
      scopes: Array.isArray(row.scopes) ? row.scopes : ['brand.affiliate.read'],
      isActive: row.isActive,
      ownerUserId: String(row.ownerUser),
      directoryEntryId: String(row.directoryEntry),
      lastUsedAt: toIsoOrNull(row.lastUsedAt ?? null),
      expiresAt: toIsoOrNull(row.expiresAt ?? null),
      revokedAt: toIsoOrNull(row.revokedAt ?? null),
      metadata: row.metadata ?? null,
      createdAt: toIsoOrNull(row.createdAt),
      updatedAt: toIsoOrNull(row.updatedAt),
    }
  }

  private mapUsageItem(row: ApiUsageLeanRow) {
    return {
      id: String(row._id),
      apiKeyId: String(row.apiKey),
      keyPrefix: row.keyPrefix,
      directoryEntryId: String(row.directoryEntry),
      scope: row.scope,
      method: row.method,
      path: row.path,
      statusCode: row.statusCode,
      durationMs: row.durationMs,
      requestId: row.requestId ?? null,
      userAgent: row.userAgent ?? null,
      metadata: row.metadata ?? null,
      createdAt: toIsoOrNull(row.createdAt),
    }
  }

  private async buildUniqueKeyPair(): Promise<{ apiKey: string; keyPrefix: string; keyHash: string }> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const keyId = randomAlphanumeric(12, KEY_PREFIX_ID_LENGTH)
      const secret = randomAlphanumeric(24, KEY_SECRET_LENGTH)
      const keyPrefix = `${KEY_PREFIX_BASE}${keyId}`
      if (!KEY_PREFIX_REGEX.test(keyPrefix)) continue

      const apiKey = `${keyPrefix}.${secret}`
      const keyHash = hashApiKey(apiKey)
      const existing = await BrandIntegrationApiKey.exists({
        $or: [{ keyPrefix }, { keyHash }],
      })
      if (!existing) {
        return { apiKey, keyPrefix, keyHash }
      }
    }

    throw new BrandIntegrationApiKeyServiceError(500, 'Falha ao gerar API key unica.')
  }

  async createOwnedApiKey(ownerUserId: string, input: Record<string, unknown>) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const directoryEntryIdRaw = normalizeOptionalString(input.directoryEntryId)
    if (!directoryEntryIdRaw) {
      throw new BrandIntegrationApiKeyServiceError(400, 'directoryEntryId obrigatorio.')
    }
    const directoryEntryId = await this.assertOwnedDirectoryEntry(ownerObjectId, directoryEntryIdRaw)

    const scopes = normalizeScopeList(input.scopes)
    if (!scopes) {
      throw new BrandIntegrationApiKeyServiceError(
        400,
        'scopes invalidos. Valores permitidos: brand.affiliate.read.'
      )
    }

    const expiresAt = toDateOrNull(input.expiresAt)
    if (input.expiresAt !== undefined && !expiresAt) {
      throw new BrandIntegrationApiKeyServiceError(400, 'expiresAt invalido.')
    }
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BrandIntegrationApiKeyServiceError(400, 'expiresAt deve ser uma data futura.')
    }

    const { apiKey, keyPrefix, keyHash } = await this.buildUniqueKeyPair()
    const created = await BrandIntegrationApiKey.create({
      keyPrefix,
      keyHash,
      ownerUser: ownerObjectId,
      directoryEntry: directoryEntryId,
      label: normalizeOptionalString(input.label),
      scopes,
      isActive: true,
      expiresAt: expiresAt ?? null,
      metadata: normalizeMetadata(input.metadata),
      createdBy: ownerObjectId,
      updatedBy: ownerObjectId,
    })

    const row = await BrandIntegrationApiKey.findById(created._id).lean<ApiKeyLeanRow | null>()
    if (!row) {
      throw new BrandIntegrationApiKeyServiceError(500, 'Falha ao ler API key criada.')
    }

    return {
      item: this.mapKeyItem(row),
      apiKey,
    }
  }

  async listOwnedApiKeys(
    ownerUserId: string,
    filters: BrandIntegrationKeyListFilters = {},
    options: BrandIntegrationKeyListOptions = {}
  ) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const query: Record<string, unknown> = {
      ownerUser: ownerObjectId,
    }

    if (filters.directoryEntryId) {
      query.directoryEntry = await this.assertOwnedDirectoryEntry(ownerObjectId, filters.directoryEntryId)
    }

    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive
    }

    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const [rows, total] = await Promise.all([
      BrandIntegrationApiKey.find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<ApiKeyLeanRow[]>(),
      BrandIntegrationApiKey.countDocuments(query),
    ])

    const items = rows.map((row) => this.mapKeyItem(row))

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        total,
        active: items.filter((item) => item.isActive).length,
        revoked: items.filter((item) => item.revokedAt !== null).length,
      },
    }
  }

  async revokeOwnedApiKey(ownerUserId: string, keyIdRaw: string) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const keyId = this.toObjectId(keyIdRaw, 'keyId')
    const key = await BrandIntegrationApiKey.findById(keyId)

    if (!key) {
      throw new BrandIntegrationApiKeyServiceError(404, 'API key de integracao nao encontrada.')
    }

    if (String(key.ownerUser) !== String(ownerObjectId)) {
      throw new BrandIntegrationApiKeyServiceError(403, 'Sem permissao para revogar esta API key.')
    }

    if (key.isActive || !key.revokedAt) {
      key.isActive = false
      key.revokedAt = new Date()
      key.revokedBy = ownerObjectId
      key.updatedBy = ownerObjectId
      await key.save()
    }

    const row = await BrandIntegrationApiKey.findById(key._id).lean<ApiKeyLeanRow | null>()
    if (!row) {
      throw new BrandIntegrationApiKeyServiceError(500, 'Falha ao ler API key revogada.')
    }

    return this.mapKeyItem(row)
  }

  async authenticateApiKey(
    apiKeyRaw: string,
    requiredScope: BrandIntegrationScope
  ): Promise<BrandIntegrationAuthContext> {
    const apiKey = normalizeApiKey(apiKeyRaw)
    if (!apiKey) {
      throw new BrandIntegrationApiKeyServiceError(401, 'API key invalida.')
    }

    const keyHash = hashApiKey(apiKey)
    const key = await BrandIntegrationApiKey.findOne({
      keyHash,
      isActive: true,
      revokedAt: null,
    }).lean<ApiKeyLeanRow | null>()

    if (!key) {
      throw new BrandIntegrationApiKeyServiceError(401, 'API key invalida ou inativa.')
    }

    if (!Array.isArray(key.scopes) || !key.scopes.includes(requiredScope)) {
      throw new BrandIntegrationApiKeyServiceError(403, 'Scope de API key insuficiente.')
    }

    if (key.expiresAt instanceof Date && key.expiresAt.getTime() <= Date.now()) {
      throw new BrandIntegrationApiKeyServiceError(401, 'API key expirada.')
    }

    await BrandIntegrationApiKey.updateOne(
      { _id: key._id },
      {
        $set: {
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    )

    return {
      keyId: String(key._id),
      keyPrefix: key.keyPrefix,
      ownerUserId: String(key.ownerUser),
      directoryEntryId: String(key.directoryEntry),
      scopes: key.scopes,
      label: key.label ?? null,
      expiresAt: toIsoOrNull(key.expiresAt ?? null),
    }
  }

  async recordUsage(input: {
    context: BrandIntegrationAuthContext
    scope: BrandIntegrationScope
    method: string
    path: string
    statusCode: number
    durationMs: number
    requestId?: string | null
    ip?: string | null
    userAgent?: string | null
    metadata?: Record<string, unknown> | null
  }) {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + API_USAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000)

    await BrandIntegrationApiUsage.create({
      apiKey: new mongoose.Types.ObjectId(input.context.keyId),
      keyPrefix: input.context.keyPrefix,
      ownerUser: new mongoose.Types.ObjectId(input.context.ownerUserId),
      directoryEntry: new mongoose.Types.ObjectId(input.context.directoryEntryId),
      scope: input.scope,
      method: normalizeMethod(input.method),
      path: normalizeOptionalString(input.path, 500) ?? '/unknown',
      statusCode: clampToNumberRange(input.statusCode, 100, 599, 500),
      durationMs: clampToNumberRange(input.durationMs, 0, 600000, 0),
      requestId: normalizeOptionalString(input.requestId, 120),
      ipHash: toIpHash(input.ip),
      userAgent: normalizeOptionalString(input.userAgent, 800),
      metadata: normalizeMetadata(input.metadata),
      expiresAt,
    })
  }

  async listOwnedApiKeyUsage(
    ownerUserId: string,
    keyIdRaw: string,
    filters: BrandIntegrationUsageListFilters = {},
    options: BrandIntegrationUsageListOptions = {}
  ) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const key = await this.findOwnedApiKey(ownerObjectId, keyIdRaw)

    const query: Record<string, unknown> = {
      apiKey: key._id,
      ownerUser: ownerObjectId,
    }

    if (typeof filters.days === 'number' && Number.isFinite(filters.days) && filters.days > 0) {
      const from = new Date(Date.now() - Math.floor(filters.days) * 24 * 60 * 60 * 1000)
      query.createdAt = { $gte: from }
    }

    const method = normalizeOptionalString(filters.method, 10)
    if (method) {
      query.method = normalizeMethod(method)
    }

    const statusFrom =
      typeof filters.statusCodeFrom === 'number' && Number.isFinite(filters.statusCodeFrom)
        ? Math.max(100, Math.min(599, Math.floor(filters.statusCodeFrom)))
        : null
    const statusTo =
      typeof filters.statusCodeTo === 'number' && Number.isFinite(filters.statusCodeTo)
        ? Math.max(100, Math.min(599, Math.floor(filters.statusCodeTo)))
        : null
    if (statusFrom !== null || statusTo !== null) {
      query.statusCode = {}
      if (statusFrom !== null) {
        ;(query.statusCode as Record<string, unknown>).$gte = statusFrom
      }
      if (statusTo !== null) {
        ;(query.statusCode as Record<string, unknown>).$lte = statusTo
      }
    }

    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const [rows, total, summaryRows, topEndpoints] = await Promise.all([
      BrandIntegrationApiUsage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<ApiUsageLeanRow[]>(),
      BrandIntegrationApiUsage.countDocuments(query),
      BrandIntegrationApiUsage.aggregate<{
        _id: null
        totalCalls: number
        avgDurationMs: number
        status2xx: number
        status4xx: number
        status5xx: number
      }>([
        { $match: query },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: 1 },
            avgDurationMs: { $avg: '$durationMs' },
            status2xx: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 300] }],
                  },
                  1,
                  0,
                ],
              },
            },
            status4xx: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $gte: ['$statusCode', 400] }, { $lt: ['$statusCode', 500] }],
                  },
                  1,
                  0,
                ],
              },
            },
            status5xx: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $gte: ['$statusCode', 500] }, { $lt: ['$statusCode', 600] }],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      BrandIntegrationApiUsage.aggregate<{
        _id: { method: string; path: string }
        calls: number
      }>([
        { $match: query },
        {
          $group: {
            _id: { method: '$method', path: '$path' },
            calls: { $sum: 1 },
          },
        },
        { $sort: { calls: -1 } },
        { $limit: 10 },
      ]),
    ])

    const summary = summaryRows[0] ?? {
      _id: null,
      totalCalls: 0,
      avgDurationMs: 0,
      status2xx: 0,
      status4xx: 0,
      status5xx: 0,
    }

    return {
      apiKey: this.mapKeyItem(key),
      items: rows.map((row) => this.mapUsageItem(row)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        totalCalls: summary.totalCalls,
        avgDurationMs: Math.round(summary.avgDurationMs || 0),
        status2xx: summary.status2xx,
        status4xx: summary.status4xx,
        status5xx: summary.status5xx,
      },
      topEndpoints: topEndpoints.map((item) => ({
        method: item._id.method,
        path: item._id.path,
        calls: item.calls,
      })),
    }
  }

  async getAffiliateOverviewFromIntegration(context: BrandIntegrationAuthContext, days?: number) {
    const overview = await affiliateTrackingService.getAdminOverview({
      days,
      ownerUserId: context.ownerUserId,
      directoryEntryId: context.directoryEntryId,
    })

    return {
      integration: {
        keyId: context.keyId,
        keyPrefix: context.keyPrefix,
        directoryEntryId: context.directoryEntryId,
        scopes: context.scopes,
      },
      ...overview,
    }
  }

  async listAffiliateLinksFromIntegration(
    context: BrandIntegrationAuthContext,
    input: {
      isActive?: boolean
      search?: string
      page?: number
      limit?: number
    } = {}
  ) {
    return affiliateTrackingService.listOwnedLinks(
      context.ownerUserId,
      {
        directoryEntryId: context.directoryEntryId,
        isActive: input.isActive,
        search: input.search,
      },
      {
        page: input.page,
        limit: input.limit,
      }
    )
  }
}

export const brandIntegrationApiKeyService = new BrandIntegrationApiKeyService()
