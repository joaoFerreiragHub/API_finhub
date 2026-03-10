import crypto from 'crypto'
import mongoose from 'mongoose'
import { AffiliateClick } from '../models/AffiliateClick'
import { AffiliateLink } from '../models/AffiliateLink'
import { DirectoryEntry } from '../models/DirectoryEntry'
import { resolvePagination } from '../utils/pagination'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const DEFAULT_WINDOW_DAYS = 30
const MIN_WINDOW_DAYS = 1
const MAX_WINDOW_DAYS = 365
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{3,39}$/
const AFFILIATE_TRACKING_CLICK_ID_PARAM = 'fh_click_id'
const AFFILIATE_TRACKING_CODE_PARAM = 'fh_aff_code'

export interface AffiliateLinkListFilters {
  directoryEntryId?: string
  isActive?: boolean
  search?: string
}

export interface AffiliateLinkListOptions {
  page?: number
  limit?: number
}

export interface AffiliateClickListFilters {
  converted?: boolean
  days?: number
  from?: string | Date
  to?: string | Date
}

export interface AffiliateClickListOptions {
  page?: number
  limit?: number
}

export interface AdminAffiliateOverviewFilters {
  days?: number
  ownerUserId?: string
  directoryEntryId?: string
  code?: string
}

export interface AdminAffiliateLinkFilters {
  ownerUserId?: string
  directoryEntryId?: string
  isActive?: boolean
  search?: string
}

export interface AdminAffiliateLinkOptions {
  page?: number
  limit?: number
}

type LinkMetricsRow = {
  _id: mongoose.Types.ObjectId
  clicks: number
  conversions: number
  revenueCents: number
  lastClickedAt?: Date | null
}

type LinkAggregateMetrics = {
  clicks: number
  conversions: number
  revenueCents: number
  lastClickedAt: Date | null
}

type LinkLeanRow = {
  _id: mongoose.Types.ObjectId
  code: string
  directoryEntry: mongoose.Types.ObjectId
  ownerUser: mongoose.Types.ObjectId
  destinationUrl: string
  label?: string | null
  isActive: boolean
  commissionRateBps?: number | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

type DirectoryLeanRow = {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  verticalType: string
}

type ClickLeanRow = {
  _id: mongoose.Types.ObjectId
  link: mongoose.Types.ObjectId
  code: string
  directoryEntry: mongoose.Types.ObjectId
  ownerUser: mongoose.Types.ObjectId
  visitorUser?: mongoose.Types.ObjectId | null
  ipHash?: string | null
  userAgent?: string | null
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
  clickedAt: Date
  converted: boolean
  convertedAt?: Date | null
  conversionValueCents?: number | null
  conversionCurrency?: string | null
  conversionReference?: string | null
  convertedBy?: mongoose.Types.ObjectId | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

type LinkLookup = {
  _id: mongoose.Types.ObjectId
  code: string
  label?: string | null
  destinationUrl: string
  isActive: boolean
  directoryEntry: mongoose.Types.ObjectId
  ownerUser: mongoose.Types.ObjectId
}

type DailyOverviewRow = {
  _id: string
  clicks: number
  conversions: number
  revenueCents: number
}

type DirectoryOverviewRow = {
  _id: mongoose.Types.ObjectId
  clicks: number
  conversions: number
  revenueCents: number
}

type LinkOverviewRow = {
  _id: mongoose.Types.ObjectId
  code: string
  clicks: number
  conversions: number
  revenueCents: number
  lastClickedAt?: Date | null
}

const toIsoOrNull = (value: Date | null | undefined): string | null =>
  value instanceof Date ? value.toISOString() : null

const toSafeNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return value
}

const round = (value: number, decimals = 2): number => {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const computeRate = (numerator: number, denominator: number): number => {
  if (denominator <= 0) return 0
  return round((numerator / denominator) * 100, 2)
}

const clampWindowDays = (value?: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_WINDOW_DAYS
  return Math.max(MIN_WINDOW_DAYS, Math.min(MAX_WINDOW_DAYS, Math.floor(value)))
}

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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeSearchRegex = (value?: string): RegExp | null => {
  const normalized = normalizeOptionalString(value, 120)
  if (!normalized) return null
  return new RegExp(escapeRegExp(normalized), 'i')
}

const normalizeCurrency = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  if (!normalized) return null
  return normalized.slice(0, 8)
}

const normalizeCode = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  if (!CODE_PATTERN.test(normalized)) return null
  return normalized
}

const normalizeCommissionRateBps = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.round(value)
    if (rounded >= 0 && rounded <= 10000) return rounded
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10000) {
      return parsed
    }
  }
  return null
}

const normalizeDestinationUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null

  try {
    const parsed = new URL(normalized)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

const toObjectIdIfValid = (value: string | null | undefined): mongoose.Types.ObjectId | null => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null
  return new mongoose.Types.ObjectId(value)
}

const normalizeConversionValueCents = (valueCentsRaw: unknown, valueRaw: unknown): number | null => {
  if (typeof valueCentsRaw === 'number' && Number.isFinite(valueCentsRaw)) {
    const rounded = Math.round(valueCentsRaw)
    if (rounded >= 0) return rounded
  }

  if (typeof valueCentsRaw === 'string') {
    const parsed = Number.parseFloat(valueCentsRaw)
    if (Number.isFinite(parsed)) {
      const rounded = Math.round(parsed)
      if (rounded >= 0) return rounded
    }
  }

  if (typeof valueRaw === 'number' && Number.isFinite(valueRaw)) {
    const rounded = Math.round(valueRaw * 100)
    if (rounded >= 0) return rounded
  }

  if (typeof valueRaw === 'string') {
    const parsed = Number.parseFloat(valueRaw)
    if (Number.isFinite(parsed)) {
      const rounded = Math.round(parsed * 100)
      if (rounded >= 0) return rounded
    }
  }

  return null
}

const toIpHash = (ipValue: unknown): string | null => {
  const normalized = normalizeOptionalString(ipValue, 200)
  if (!normalized) return null
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

const appendAffiliateTrackingParams = (destinationUrl: string, clickId: string, code: string): string => {
  try {
    const parsed = new URL(destinationUrl)
    if (!parsed.searchParams.has(AFFILIATE_TRACKING_CLICK_ID_PARAM)) {
      parsed.searchParams.set(AFFILIATE_TRACKING_CLICK_ID_PARAM, clickId)
    }
    if (!parsed.searchParams.has(AFFILIATE_TRACKING_CODE_PARAM)) {
      parsed.searchParams.set(AFFILIATE_TRACKING_CODE_PARAM, code)
    }
    return parsed.toString()
  } catch {
    return destinationUrl
  }
}

export class AffiliateTrackingServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class AffiliateTrackingService {
  private toObjectId(value: string, fieldName: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new AffiliateTrackingServiceError(400, `${fieldName} invalido.`)
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
      throw new AffiliateTrackingServiceError(
        403,
        'Sem permissao para gerir links deste DirectoryEntry.'
      )
    }

    return directoryEntryId
  }

  private async ensureUniqueCode(requestedCodeRaw?: unknown): Promise<string> {
    const requestedCode = normalizeCode(requestedCodeRaw)
    if (requestedCodeRaw !== undefined && !requestedCode) {
      throw new AffiliateTrackingServiceError(
        400,
        'Code invalido. Usa 4-40 caracteres [A-Z0-9_-].'
      )
    }

    if (requestedCode) {
      const existing = await AffiliateLink.exists({ code: requestedCode })
      if (existing) {
        throw new AffiliateTrackingServiceError(409, 'Code ja existe.')
      }
      return requestedCode
    }

    for (let attempt = 0; attempt < 16; attempt += 1) {
      const random = crypto
        .randomBytes(6)
        .toString('base64url')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
      const candidate = `AF${random}`.slice(0, 12)
      if (!CODE_PATTERN.test(candidate)) {
        continue
      }
      const exists = await AffiliateLink.exists({ code: candidate })
      if (!exists) {
        return candidate
      }
    }

    throw new AffiliateTrackingServiceError(500, 'Falha a gerar code unico de afiliacao.')
  }

  private mapDirectoryMap(rows: DirectoryLeanRow[]) {
    return new Map(
      rows.map((row) => [
        String(row._id),
        {
          id: String(row._id),
          name: row.name,
          slug: row.slug,
          verticalType: row.verticalType,
        },
      ])
    )
  }

  private mapLinkMetricsMap(rows: LinkMetricsRow[]) {
    const map = new Map<string, LinkAggregateMetrics>()
    for (const row of rows) {
      map.set(String(row._id), {
        clicks: toSafeNumber(row.clicks),
        conversions: toSafeNumber(row.conversions),
        revenueCents: toSafeNumber(row.revenueCents),
        lastClickedAt: row.lastClickedAt instanceof Date ? row.lastClickedAt : null,
      })
    }
    return map
  }

  private async getLinkMetrics(linkIds: mongoose.Types.ObjectId[]) {
    if (linkIds.length === 0) {
      return new Map<string, LinkAggregateMetrics>()
    }

    const rows = await AffiliateClick.aggregate<LinkMetricsRow>([
      {
        $match: {
          link: { $in: linkIds },
        },
      },
      {
        $group: {
          _id: '$link',
          clicks: { $sum: 1 },
          conversions: {
            $sum: {
              $cond: [{ $eq: ['$converted', true] }, 1, 0],
            },
          },
          revenueCents: { $sum: { $ifNull: ['$conversionValueCents', 0] } },
          lastClickedAt: { $max: '$clickedAt' },
        },
      },
    ])

    return this.mapLinkMetricsMap(rows)
  }

  private mapLinkItem(
    row: LinkLeanRow,
    directoryMap: Map<string, { id: string; name: string; slug: string; verticalType: string }>,
    metricsMap: Map<string, LinkAggregateMetrics>
  ) {
    const metrics = metricsMap.get(String(row._id)) ?? {
      clicks: 0,
      conversions: 0,
      revenueCents: 0,
      lastClickedAt: null,
    }

    return {
      id: String(row._id),
      code: row.code,
      destinationUrl: row.destinationUrl,
      label: row.label ?? null,
      isActive: row.isActive,
      commissionRateBps: row.commissionRateBps ?? null,
      metadata: row.metadata ?? null,
      directoryEntry:
        directoryMap.get(String(row.directoryEntry)) ?? {
          id: String(row.directoryEntry),
          name: null,
          slug: null,
          verticalType: null,
        },
      ownerUserId: String(row.ownerUser),
      metrics: {
        clicks: metrics.clicks,
        conversions: metrics.conversions,
        conversionRate: computeRate(metrics.conversions, metrics.clicks),
        revenueCents: metrics.revenueCents,
        lastClickedAt: toIsoOrNull(metrics.lastClickedAt),
      },
      createdAt: toIsoOrNull(row.createdAt),
      updatedAt: toIsoOrNull(row.updatedAt),
    }
  }

  private mapConversionItem(row: {
    _id: unknown
    converted: boolean
    convertedAt?: Date | null
    conversionValueCents?: number | null
    conversionCurrency?: string | null
    conversionReference?: string | null
  }) {
    return {
      id: String(row._id),
      converted: row.converted,
      convertedAt: toIsoOrNull(row.convertedAt ?? null),
      conversionValueCents: row.conversionValueCents ?? null,
      conversionCurrency: row.conversionCurrency ?? null,
      conversionReference: row.conversionReference ?? null,
    }
  }

  async listOwnedLinks(
    ownerUserId: string,
    filters: AffiliateLinkListFilters = {},
    options: AffiliateLinkListOptions = {}
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

    const searchRegex = normalizeSearchRegex(filters.search)
    if (searchRegex) {
      query.$or = [{ code: searchRegex }, { label: searchRegex }, { destinationUrl: searchRegex }]
    }

    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const [rows, total] = await Promise.all([
      AffiliateLink.find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<LinkLeanRow[]>(),
      AffiliateLink.countDocuments(query),
    ])

    const linkIds = rows.map((row) => row._id)
    const directoryIds = Array.from(new Set(rows.map((row) => String(row.directoryEntry))))
      .map((value) => new mongoose.Types.ObjectId(value))

    const [metricsMap, directoryRows] = await Promise.all([
      this.getLinkMetrics(linkIds),
      directoryIds.length > 0
        ? DirectoryEntry.find({ _id: { $in: directoryIds } })
            .select('name slug verticalType')
            .lean<DirectoryLeanRow[]>()
        : Promise.resolve([] as DirectoryLeanRow[]),
    ])

    const directoryMap = this.mapDirectoryMap(directoryRows)
    const items = rows.map((row) => this.mapLinkItem(row, directoryMap, metricsMap))

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
        clicksOnPage: items.reduce((acc, item) => acc + item.metrics.clicks, 0),
        conversionsOnPage: items.reduce((acc, item) => acc + item.metrics.conversions, 0),
        revenueCentsOnPage: items.reduce((acc, item) => acc + item.metrics.revenueCents, 0),
      },
    }
  }

  async createOwnedLink(ownerUserId: string, input: Record<string, unknown>) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const directoryEntryIdRaw = normalizeOptionalString(input.directoryEntryId)
    if (!directoryEntryIdRaw) {
      throw new AffiliateTrackingServiceError(400, 'directoryEntryId obrigatorio.')
    }

    const directoryEntryId = await this.assertOwnedDirectoryEntry(ownerObjectId, directoryEntryIdRaw)

    const destinationUrl = normalizeDestinationUrl(input.destinationUrl)
    if (!destinationUrl) {
      throw new AffiliateTrackingServiceError(400, 'destinationUrl invalido. Usa URL http/https.')
    }

    const commissionRateBps = normalizeCommissionRateBps(input.commissionRateBps)
    if (input.commissionRateBps !== undefined && commissionRateBps === null) {
      throw new AffiliateTrackingServiceError(
        400,
        'commissionRateBps invalido. Usa inteiro entre 0 e 10000.'
      )
    }

    const code = await this.ensureUniqueCode(input.code)

    const created = await AffiliateLink.create({
      code,
      directoryEntry: directoryEntryId,
      ownerUser: ownerObjectId,
      destinationUrl,
      label: normalizeOptionalString(input.label),
      isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
      commissionRateBps,
      metadata: normalizeMetadata(input.metadata),
      createdBy: ownerObjectId,
      updatedBy: ownerObjectId,
    })

    const row = await AffiliateLink.findById(created._id).lean<LinkLeanRow | null>()
    if (!row) {
      throw new AffiliateTrackingServiceError(500, 'Falha ao ler link de afiliacao criado.')
    }

    const [directoryRows, metricsMap] = await Promise.all([
      DirectoryEntry.find({ _id: row.directoryEntry })
        .select('name slug verticalType')
        .lean<DirectoryLeanRow[]>(),
      this.getLinkMetrics([row._id]),
    ])

    return this.mapLinkItem(row, this.mapDirectoryMap(directoryRows), metricsMap)
  }

  async updateOwnedLink(ownerUserId: string, linkIdRaw: string, input: Record<string, unknown>) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const linkId = this.toObjectId(linkIdRaw, 'linkId')

    const link = await AffiliateLink.findById(linkId)
    if (!link) {
      throw new AffiliateTrackingServiceError(404, 'Link de afiliacao nao encontrado.')
    }

    if (String(link.ownerUser) !== String(ownerObjectId)) {
      throw new AffiliateTrackingServiceError(403, 'Sem permissao para atualizar este link.')
    }

    let changed = false

    if ('directoryEntryId' in input) {
      const directoryEntryIdRaw = normalizeOptionalString(input.directoryEntryId)
      if (!directoryEntryIdRaw) {
        throw new AffiliateTrackingServiceError(400, 'directoryEntryId invalido.')
      }
      const directoryEntryId = await this.assertOwnedDirectoryEntry(ownerObjectId, directoryEntryIdRaw)
      link.directoryEntry = directoryEntryId
      changed = true
    }

    if ('destinationUrl' in input) {
      const destinationUrl = normalizeDestinationUrl(input.destinationUrl)
      if (!destinationUrl) {
        throw new AffiliateTrackingServiceError(400, 'destinationUrl invalido. Usa URL http/https.')
      }
      link.destinationUrl = destinationUrl
      changed = true
    }

    if ('label' in input) {
      link.label = normalizeOptionalString(input.label)
      changed = true
    }

    if ('isActive' in input) {
      if (typeof input.isActive !== 'boolean') {
        throw new AffiliateTrackingServiceError(400, 'isActive invalido.')
      }
      link.isActive = input.isActive
      changed = true
    }

    if ('commissionRateBps' in input) {
      const commissionRateBps = normalizeCommissionRateBps(input.commissionRateBps)
      if (input.commissionRateBps !== null && input.commissionRateBps !== undefined && commissionRateBps === null) {
        throw new AffiliateTrackingServiceError(
          400,
          'commissionRateBps invalido. Usa inteiro entre 0 e 10000.'
        )
      }
      link.commissionRateBps = commissionRateBps
      changed = true
    }

    if ('metadata' in input) {
      link.metadata = normalizeMetadata(input.metadata)
      changed = true
    }

    if ('code' in input) {
      const nextCode = normalizeCode(input.code)
      if (!nextCode) {
        throw new AffiliateTrackingServiceError(
          400,
          'Code invalido. Usa 4-40 caracteres [A-Z0-9_-].'
        )
      }

      if (nextCode !== link.code) {
        const existing = await AffiliateLink.exists({ code: nextCode, _id: { $ne: link._id } })
        if (existing) {
          throw new AffiliateTrackingServiceError(409, 'Code ja existe.')
        }
        link.code = nextCode
        changed = true
      }
    }

    if (!changed) {
      throw new AffiliateTrackingServiceError(400, 'Sem campos validos para atualizar.')
    }

    link.updatedBy = ownerObjectId
    await link.save()

    const row = await AffiliateLink.findById(link._id).lean<LinkLeanRow | null>()
    if (!row) {
      throw new AffiliateTrackingServiceError(500, 'Falha ao ler link de afiliacao atualizado.')
    }

    const [directoryRows, metricsMap] = await Promise.all([
      DirectoryEntry.find({ _id: row.directoryEntry })
        .select('name slug verticalType')
        .lean<DirectoryLeanRow[]>(),
      this.getLinkMetrics([row._id]),
    ])

    return this.mapLinkItem(row, this.mapDirectoryMap(directoryRows), metricsMap)
  }

  async listOwnedLinkClicks(
    ownerUserId: string,
    linkIdRaw: string,
    filters: AffiliateClickListFilters = {},
    options: AffiliateClickListOptions = {}
  ) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const linkId = this.toObjectId(linkIdRaw, 'linkId')

    const link = await AffiliateLink.findById(linkId)
      .select('code label destinationUrl directoryEntry ownerUser')
      .lean<LinkLookup | null>()

    if (!link) {
      throw new AffiliateTrackingServiceError(404, 'Link de afiliacao nao encontrado.')
    }

    if (String(link.ownerUser) !== String(ownerObjectId)) {
      throw new AffiliateTrackingServiceError(403, 'Sem permissao para listar cliques deste link.')
    }

    const clickQuery: Record<string, unknown> = {
      link: linkId,
      ownerUser: ownerObjectId,
    }

    if (typeof filters.converted === 'boolean') {
      clickQuery.converted = filters.converted
    }

    const now = Date.now()
    const fromDate =
      typeof filters.days === 'number' && Number.isFinite(filters.days) && filters.days > 0
        ? new Date(now - Math.floor(filters.days) * 24 * 60 * 60 * 1000)
        : toDateOrNull(filters.from)
    const toDate = toDateOrNull(filters.to)

    if (fromDate || toDate) {
      const clickedAtMatch: Record<string, unknown> = {}
      if (fromDate) clickedAtMatch.$gte = fromDate
      if (toDate) clickedAtMatch.$lte = toDate
      clickQuery.clickedAt = clickedAtMatch
    }

    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const [rows, total, summaryRows] = await Promise.all([
      AffiliateClick.find(clickQuery)
        .sort({ clickedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<ClickLeanRow[]>(),
      AffiliateClick.countDocuments(clickQuery),
      AffiliateClick.aggregate<{ _id: null; clicks: number; conversions: number; revenueCents: number }>([
        { $match: clickQuery },
        {
          $group: {
            _id: null,
            clicks: { $sum: 1 },
            conversions: {
              $sum: {
                $cond: [{ $eq: ['$converted', true] }, 1, 0],
              },
            },
            revenueCents: { $sum: { $ifNull: ['$conversionValueCents', 0] } },
          },
        },
      ]),
    ])

    const summary = summaryRows[0] ?? {
      _id: null,
      clicks: 0,
      conversions: 0,
      revenueCents: 0,
    }

    return {
      link: {
        id: String(link._id),
        code: link.code,
        label: link.label ?? null,
        destinationUrl: link.destinationUrl,
        directoryEntryId: String(link.directoryEntry),
      },
      items: rows.map((row) => ({
        id: String(row._id),
        clickedAt: toIsoOrNull(row.clickedAt),
        converted: row.converted,
        convertedAt: toIsoOrNull(row.convertedAt ?? null),
        conversionValueCents:
          typeof row.conversionValueCents === 'number' ? row.conversionValueCents : null,
        conversionCurrency: row.conversionCurrency ?? null,
        conversionReference: row.conversionReference ?? null,
        visitorUserId: row.visitorUser ? String(row.visitorUser) : null,
        userAgent: row.userAgent ?? null,
        referrer: row.referrer ?? null,
        utm: {
          source: row.utmSource ?? null,
          medium: row.utmMedium ?? null,
          campaign: row.utmCampaign ?? null,
          term: row.utmTerm ?? null,
          content: row.utmContent ?? null,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        clicks: toSafeNumber(summary.clicks),
        conversions: toSafeNumber(summary.conversions),
        conversionRate: computeRate(toSafeNumber(summary.conversions), toSafeNumber(summary.clicks)),
        revenueCents: toSafeNumber(summary.revenueCents),
      },
    }
  }

  async resolveAndTrackRedirect(input: {
    code: string
    visitorUserId?: string | null
    ip?: string | null
    userAgent?: string | null
    referrer?: string | null
    utmSource?: string | null
    utmMedium?: string | null
    utmCampaign?: string | null
    utmTerm?: string | null
    utmContent?: string | null
    metadata?: Record<string, unknown> | null
  }) {
    const code = normalizeCode(input.code)
    if (!code) {
      throw new AffiliateTrackingServiceError(400, 'Code de afiliacao invalido.')
    }

    const link = await AffiliateLink.findOne({ code, isActive: true })
      .select('code directoryEntry ownerUser destinationUrl isActive')
      .lean<{
        _id: mongoose.Types.ObjectId
        code: string
        directoryEntry: mongoose.Types.ObjectId
        ownerUser: mongoose.Types.ObjectId
        destinationUrl: string
        isActive: boolean
      } | null>()

    if (!link) {
      throw new AffiliateTrackingServiceError(404, 'Link de afiliacao nao encontrado ou inativo.')
    }

    const visitorUserObjectId = toObjectIdIfValid(input.visitorUserId ?? null)
    const click = await AffiliateClick.create({
      link: link._id,
      code: link.code,
      directoryEntry: link.directoryEntry,
      ownerUser: link.ownerUser,
      visitorUser: visitorUserObjectId,
      ipHash: toIpHash(input.ip),
      userAgent: normalizeOptionalString(input.userAgent, 800),
      referrer: normalizeOptionalString(input.referrer, 1200),
      utmSource: normalizeOptionalString(input.utmSource, 120),
      utmMedium: normalizeOptionalString(input.utmMedium, 120),
      utmCampaign: normalizeOptionalString(input.utmCampaign, 160),
      utmTerm: normalizeOptionalString(input.utmTerm, 160),
      utmContent: normalizeOptionalString(input.utmContent, 160),
      clickedAt: new Date(),
      converted: false,
      metadata: normalizeMetadata(input.metadata),
    })

    return {
      redirectUrl: appendAffiliateTrackingParams(link.destinationUrl, String(click._id), link.code),
      click: {
        id: String(click._id),
        code: link.code,
        linkId: String(link._id),
        directoryEntryId: String(link.directoryEntry),
        ownerUserId: String(link.ownerUser),
        clickedAt: toIsoOrNull(click.clickedAt),
      },
    }
  }

  async markClickConversion(
    actorUserId: string,
    clickIdRaw: string,
    input: {
      valueCents?: unknown
      value?: unknown
      currency?: unknown
      reference?: unknown
      metadata?: unknown
      force?: unknown
    } = {}
  ) {
    const actorObjectId = this.toObjectId(actorUserId, 'actorUserId')
    const clickId = this.toObjectId(clickIdRaw, 'clickId')

    const click = await AffiliateClick.findById(clickId)
    if (!click) {
      throw new AffiliateTrackingServiceError(404, 'Clique de afiliacao nao encontrado.')
    }

    const force = input.force === true
    if (click.converted && !force) {
      return {
        updated: false,
        item: this.mapConversionItem(click),
      }
    }

    const conversionValueCents = normalizeConversionValueCents(input.valueCents, input.value)
    if ((input.valueCents !== undefined || input.value !== undefined) && conversionValueCents === null) {
      throw new AffiliateTrackingServiceError(
        400,
        'Valor de conversao invalido. Usa valueCents inteiro >= 0 ou value numerico >= 0.'
      )
    }

    const currency = normalizeCurrency(input.currency)
    if (input.currency !== undefined && !currency) {
      throw new AffiliateTrackingServiceError(400, 'currency invalido.')
    }

    const reference = normalizeOptionalString(input.reference, 160)
    if (reference) {
      const existingWithSameReference = await AffiliateClick.findOne({
        conversionReference: reference,
        _id: { $ne: click._id },
      })
        .select('_id')
        .lean<{ _id: mongoose.Types.ObjectId } | null>()

      if (existingWithSameReference && !force) {
        throw new AffiliateTrackingServiceError(
          409,
          'conversionReference ja associado a outro clique.'
        )
      }
    }

    click.converted = true
    click.convertedAt = new Date()
    click.convertedBy = actorObjectId
    click.conversionValueCents = conversionValueCents
    click.conversionCurrency = currency
    click.conversionReference = reference
    click.metadata = normalizeMetadata(input.metadata)
    await click.save()

    return {
      updated: true,
      item: this.mapConversionItem(click),
    }
  }

  async markClickConversionFromPostback(
    input: {
      clickId?: unknown
      valueCents?: unknown
      value?: unknown
      currency?: unknown
      reference?: unknown
      provider?: unknown
      metadata?: unknown
      force?: unknown
    } = {}
  ) {
    const clickIdRaw = normalizeOptionalString(input.clickId, 60)
    if (!clickIdRaw) {
      throw new AffiliateTrackingServiceError(400, 'clickId obrigatorio para postback de conversao.')
    }

    const clickId = this.toObjectId(clickIdRaw, 'clickId')
    const click = await AffiliateClick.findById(clickId)
    if (!click) {
      throw new AffiliateTrackingServiceError(404, 'Clique de afiliacao nao encontrado.')
    }

    const force = input.force === true
    if (click.converted && !force) {
      return {
        updated: false,
        source: 'postback',
        item: this.mapConversionItem(click),
      }
    }

    const conversionValueCents = normalizeConversionValueCents(input.valueCents, input.value)
    if ((input.valueCents !== undefined || input.value !== undefined) && conversionValueCents === null) {
      throw new AffiliateTrackingServiceError(
        400,
        'Valor de conversao invalido. Usa valueCents inteiro >= 0 ou value numerico >= 0.'
      )
    }

    const currency = normalizeCurrency(input.currency)
    if (input.currency !== undefined && !currency) {
      throw new AffiliateTrackingServiceError(400, 'currency invalido.')
    }

    const reference = normalizeOptionalString(input.reference, 160)
    if (reference) {
      const existingWithSameReference = await AffiliateClick.findOne({
        conversionReference: reference,
        _id: { $ne: click._id },
      })
        .select('_id')
        .lean<{ _id: mongoose.Types.ObjectId } | null>()

      if (existingWithSameReference && !force) {
        throw new AffiliateTrackingServiceError(
          409,
          'conversionReference ja associado a outro clique.'
        )
      }
    }

    const provider = normalizeOptionalString(input.provider, 80)
    const metadata = normalizeMetadata(input.metadata) ?? {}
    const metadataWithSource: Record<string, unknown> = {
      ...metadata,
      conversionSource: 'postback',
    }
    if (provider) {
      metadataWithSource.provider = provider
    }

    click.converted = true
    click.convertedAt = new Date()
    click.convertedBy = null
    click.conversionValueCents = conversionValueCents
    click.conversionCurrency = currency
    click.conversionReference = reference
    click.metadata = metadataWithSource
    await click.save()

    return {
      updated: true,
      source: 'postback',
      item: this.mapConversionItem(click),
    }
  }

  async listAdminLinks(
    filters: AdminAffiliateLinkFilters = {},
    options: AdminAffiliateLinkOptions = {}
  ) {
    const query: Record<string, unknown> = {}

    if (filters.ownerUserId) {
      query.ownerUser = this.toObjectId(filters.ownerUserId, 'ownerUserId')
    }

    if (filters.directoryEntryId) {
      query.directoryEntry = this.toObjectId(filters.directoryEntryId, 'directoryEntryId')
    }

    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive
    }

    const searchRegex = normalizeSearchRegex(filters.search)
    if (searchRegex) {
      query.$or = [{ code: searchRegex }, { label: searchRegex }, { destinationUrl: searchRegex }]
    }

    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const [rows, total] = await Promise.all([
      AffiliateLink.find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<LinkLeanRow[]>(),
      AffiliateLink.countDocuments(query),
    ])

    const linkIds = rows.map((row) => row._id)
    const directoryIds = Array.from(new Set(rows.map((row) => String(row.directoryEntry))))
      .map((value) => new mongoose.Types.ObjectId(value))

    const [metricsMap, directoryRows] = await Promise.all([
      this.getLinkMetrics(linkIds),
      directoryIds.length > 0
        ? DirectoryEntry.find({ _id: { $in: directoryIds } })
            .select('name slug verticalType')
            .lean<DirectoryLeanRow[]>()
        : Promise.resolve([] as DirectoryLeanRow[]),
    ])

    const directoryMap = this.mapDirectoryMap(directoryRows)

    return {
      items: rows.map((row) => this.mapLinkItem(row, directoryMap, metricsMap)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getAdminOverview(filters: AdminAffiliateOverviewFilters = {}) {
    const windowDays = clampWindowDays(filters.days)
    const now = new Date()
    const from = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)

    const match: Record<string, unknown> = {
      clickedAt: {
        $gte: from,
        $lte: now,
      },
    }

    if (filters.ownerUserId) {
      match.ownerUser = this.toObjectId(filters.ownerUserId, 'ownerUserId')
    }

    if (filters.directoryEntryId) {
      match.directoryEntry = this.toObjectId(filters.directoryEntryId, 'directoryEntryId')
    }

    if (filters.code) {
      const code = normalizeCode(filters.code)
      if (!code) {
        throw new AffiliateTrackingServiceError(400, 'code invalido.')
      }
      match.code = code
    }

    const [totalRows, timelineRows, directoryRows, linkRows] = await Promise.all([
      AffiliateClick.aggregate<{
        _id: null
        clicks: number
        conversions: number
        revenueCents: number
      }>([
        { $match: match },
        {
          $group: {
            _id: null,
            clicks: { $sum: 1 },
            conversions: {
              $sum: {
                $cond: [{ $eq: ['$converted', true] }, 1, 0],
              },
            },
            revenueCents: { $sum: { $ifNull: ['$conversionValueCents', 0] } },
          },
        },
      ]),
      AffiliateClick.aggregate<DailyOverviewRow>([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$clickedAt',
              },
            },
            clicks: { $sum: 1 },
            conversions: {
              $sum: {
                $cond: [{ $eq: ['$converted', true] }, 1, 0],
              },
            },
            revenueCents: { $sum: { $ifNull: ['$conversionValueCents', 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AffiliateClick.aggregate<DirectoryOverviewRow>([
        { $match: match },
        {
          $group: {
            _id: '$directoryEntry',
            clicks: { $sum: 1 },
            conversions: {
              $sum: {
                $cond: [{ $eq: ['$converted', true] }, 1, 0],
              },
            },
            revenueCents: { $sum: { $ifNull: ['$conversionValueCents', 0] } },
          },
        },
        { $sort: { revenueCents: -1, clicks: -1 } },
        { $limit: 12 },
      ]),
      AffiliateClick.aggregate<LinkOverviewRow>([
        { $match: match },
        {
          $group: {
            _id: '$link',
            code: { $first: '$code' },
            clicks: { $sum: 1 },
            conversions: {
              $sum: {
                $cond: [{ $eq: ['$converted', true] }, 1, 0],
              },
            },
            revenueCents: { $sum: { $ifNull: ['$conversionValueCents', 0] } },
            lastClickedAt: { $max: '$clickedAt' },
          },
        },
        { $sort: { revenueCents: -1, clicks: -1 } },
        { $limit: 20 },
      ]),
    ])

    const totals = totalRows[0] ?? {
      _id: null,
      clicks: 0,
      conversions: 0,
      revenueCents: 0,
    }

    const directoryIds = directoryRows.map((row) => row._id)
    const linkIds = linkRows.map((row) => row._id)

    const [directories, links] = await Promise.all([
      directoryIds.length > 0
        ? DirectoryEntry.find({ _id: { $in: directoryIds } })
            .select('name slug verticalType')
            .lean<DirectoryLeanRow[]>()
        : Promise.resolve([] as DirectoryLeanRow[]),
      linkIds.length > 0
        ? AffiliateLink.find({ _id: { $in: linkIds } })
            .select('code label destinationUrl isActive directoryEntry')
            .lean<LinkLookup[]>()
        : Promise.resolve([] as LinkLookup[]),
    ])

    const directoryMap = this.mapDirectoryMap(directories)
    const linkMap = new Map(links.map((row) => [String(row._id), row]))

    return {
      windowDays,
      from: from.toISOString(),
      to: now.toISOString(),
      totals: {
        clicks: toSafeNumber(totals.clicks),
        conversions: toSafeNumber(totals.conversions),
        conversionRate: computeRate(toSafeNumber(totals.conversions), toSafeNumber(totals.clicks)),
        revenueCents: toSafeNumber(totals.revenueCents),
      },
      timeline: timelineRows.map((row) => ({
        date: row._id,
        clicks: toSafeNumber(row.clicks),
        conversions: toSafeNumber(row.conversions),
        conversionRate: computeRate(toSafeNumber(row.conversions), toSafeNumber(row.clicks)),
        revenueCents: toSafeNumber(row.revenueCents),
      })),
      topDirectoryEntries: directoryRows.map((row) => ({
        directoryEntry:
          directoryMap.get(String(row._id)) ?? {
            id: String(row._id),
            name: null,
            slug: null,
            verticalType: null,
          },
        clicks: toSafeNumber(row.clicks),
        conversions: toSafeNumber(row.conversions),
        conversionRate: computeRate(toSafeNumber(row.conversions), toSafeNumber(row.clicks)),
        revenueCents: toSafeNumber(row.revenueCents),
      })),
      topLinks: linkRows.map((row) => {
        const link = linkMap.get(String(row._id))
        const directorySummary =
          link && directoryMap.get(String(link.directoryEntry))
            ? directoryMap.get(String(link.directoryEntry))
            : null

        return {
          linkId: String(row._id),
          code: row.code,
          label: link?.label ?? null,
          destinationUrl: link?.destinationUrl ?? null,
          isActive: link?.isActive ?? null,
          directoryEntry:
            directorySummary ??
            (link
              ? {
                  id: String(link.directoryEntry),
                  name: null,
                  slug: null,
                  verticalType: null,
                }
              : null),
          clicks: toSafeNumber(row.clicks),
          conversions: toSafeNumber(row.conversions),
          conversionRate: computeRate(toSafeNumber(row.conversions), toSafeNumber(row.clicks)),
          revenueCents: toSafeNumber(row.revenueCents),
          lastClickedAt: toIsoOrNull(row.lastClickedAt ?? null),
        }
      }),
    }
  }
}

export const affiliateTrackingService = new AffiliateTrackingService()
